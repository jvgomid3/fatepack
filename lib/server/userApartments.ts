import { getSupabaseAdmin } from "./supabaseAdmin"

// Helper: return timestamp in São Paulo time (America/Sao_Paulo) as 'YYYY-MM-DD HH:mm:ss'
function nowInSaoPauloTimestamp(): string {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts: any = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

type VinculoRow = {
  id_usuario: number
  id_apartamento: number
  data_entrada: string | null
  data_saida: string | null
}

/**
 * Change user's apartment: closes any active vinculo for the user and creates a new vinculo
 * for newApartmentId with data_entrada = now and data_saida = NULL.
 * Ensures there is at most one active vinculo for the user at any time.
 */
export async function changeUserApartment(userId: number, newApartmentId: number) {
  if (!userId || !newApartmentId) throw new Error("userId and newApartmentId are required")
  const supa = getSupabaseAdmin()

  // Prefer using the DB-side function for atomicity if it exists
  try {
    const { data, error } = await supa.rpc("change_user_apartment", { p_user: userId, p_apto: newApartmentId })
    if (error) {
      // If function not found or other DB error, fall back to JS implementation
      console.error("changeUserApartment: rpc error:", error.message)
      throw error
    }
    // supabase.rpc returns data as array of rows for set-returning functions
    if (Array.isArray(data) && data.length) {
      return { ok: true, result: data[0] }
    }
    return { ok: true, result: data }
  } catch (rpcErr) {
    // Fallback: close active vinculos and insert new one (non-atomic). This should be
    // used only if the DB function is not available.
  const ts = nowInSaoPauloTimestamp()
    const close = await supa
      .from("usuario_apartamento")
      .update({ data_saida: ts })
      .eq("id_usuario", userId)
      .is("data_saida", null)

    if (close.error) {
      console.error("changeUserApartment fallback: failed to close existing vinculos:", close.error.message)
      throw close.error
    }

    const insert = await supa
      .from("usuario_apartamento")
      .insert({ id_usuario: userId, id_apartamento: newApartmentId, data_entrada: ts })
      .select("id_vinculo, id_usuario, id_apartamento, data_entrada, data_saida")
      .single()

    if (insert.error) {
      const em = (insert.error.message || "").toLowerCase()
      const isDup = insert.error.code === "23505" || em.includes("duplicate") || em.includes("unique")
      if (isDup) {
        return { ok: false, error: "UNIQUE_VINCULO", message: "Database enforces unique vínculo per (id_usuario,id_apartamento). Run migration to allow historical rows or handle accordingly." }
      }
      console.error("changeUserApartment fallback: failed to insert new vinculo:", insert.error.message)
      throw insert.error
    }

    let closedCount = 0
    if (Array.isArray((close as any).data)) closedCount = (close as any).data.length
    else if ((close as any).data) closedCount = 1
    return { ok: true, closedCount, vinculo: insert.data }
  }
}

/**
 * Get all encomendas for a user considering each habitation window.
 * Returns encomendas ordered by data_recebimento DESC.
 */
export async function getUserEncomendas(userId: number) {
  if (!userId) throw new Error("userId required")
  const supa = getSupabaseAdmin()

  // 1) Get all vinculos for the user
  const { data: vinculos, error: vincErr } = await supa
    .from("usuario_apartamento")
    .select("id_apartamento, data_entrada, data_saida")
    .eq("id_usuario", userId)
    .order("data_entrada", { ascending: true })

  if (vincErr) {
    console.error("getUserEncomendas: vinculos query failed:", vincErr.message)
    throw vincErr
  }
  if (!vinculos || vinculos.length === 0) return []

  const aptoIds = Array.from(new Set((vinculos as any).map((v: any) => v.id_apartamento).filter(Boolean)))
  if (!aptoIds.length) return []

  // 2) Get all encomendas for these apartments
  const baseSelect = `id_encomenda, empresa_entrega, data_recebimento, id_apartamento, bloco, apartamento, nome, recebido_por, retirada:retirada!retirada_id_encomenda_fkey(id_retirada, nome_retirou, data_retirada)`
  const { data: encomendas, error: encErr } = await supa
    .from("encomenda")
    .select(baseSelect)
    .in("id_apartamento", aptoIds)
    .order("data_recebimento", { ascending: false, nullsFirst: false })
    .order("id_encomenda", { ascending: false })

  if (encErr) {
    console.error("getUserEncomendas: encomendas query failed:", encErr.message)
    throw encErr
  }

  // 3) For each encomenda, check if it falls within any vinculo interval for the same apartment
  const parseDate = (v: any) => {
    try { return v ? new Date(v) : null } catch { return null }
  }
  const now = new Date()

  const matches: any[] = []
  for (const e of (encomendas || [])) {
    const dr = parseDate(e.data_recebimento)
    if (!dr) continue
    const vForApto = (vinculos || []).filter((v: any) => Number(v.id_apartamento) === Number(e.id_apartamento))
    let visible = false
    for (const v of vForApto) {
      const de = parseDate(v.data_entrada)
      const ds = parseDate(v.data_saida)
      if (!de) continue
      if (dr >= de && (ds ? dr <= ds : dr <= now)) {
        visible = true
        break
      }
    }
    if (visible) {
      matches.push({
        id: e.id_encomenda,
        empresa_entrega: e.empresa_entrega,
        data_recebimento: e.data_recebimento,
        id_apartamento: e.id_apartamento,
        bloco: e.bloco,
        apartamento: e.apartamento,
        nome: e.nome,
        recebido_por: e.recebido_por,
        retirado_por: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].nome_retirou : null,
        data_retirada: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].data_retirada : null,
      })
    }
  }

  // already ordered by data_recebimento desc from query
  return matches
}

export type { VinculoRow }
