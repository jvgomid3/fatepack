import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/server/auth"
import { getSupabaseClient } from "../../../lib/supabaseClient"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

type UsuarioRow = {
  nome: string
  email: string
  telefone?: string | null
  tipo?: string | null
  bloco?: string | null
  apto?: string | null
  senha_hash?: string | null
}

function sanitizeStr(v: any): string | undefined {
  const s = String(v ?? "").trim()
  return s ? s : undefined
}

export async function GET(req: Request) {
  // NOTE: keep GET public for listing/searching moradores to preserve
  // existing behaviour in the UI which calls this endpoint without an
  // Authorization header. Writes (POST/PUT/DELETE) remain protected.

  try {
    const url = new URL(req.url)
    const nome = sanitizeStr(url.searchParams.get("nome"))
    const email = sanitizeStr(url.searchParams.get("email"))
    const bloco = sanitizeStr(url.searchParams.get("bloco"))
    // aceita tanto "apartamento" quanto "apto" na query
    const apartamento = sanitizeStr(url.searchParams.get("apartamento") || url.searchParams.get("apto"))

    const supabase = getSupabaseClient()
    let query = supabase
      .from("usuario")
      .select("nome, email, telefone, tipo, bloco, apto")
      .order("nome", { ascending: true })

    if (email) query = query.ilike("email", `%${email}%`)
    if (nome) query = query.ilike("nome", `%${nome}%`)
    if (bloco) query = query.eq("bloco", bloco)
    if (apartamento) query = query.eq("apto", apartamento)

    const { data, error } = await query
    if (error) {
      console.error("/api/moradores GET supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
    }

    const items = (data ?? []).map((d: any) => ({
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      tipo: d.tipo,
      bloco: d.bloco,
      apartamento: d.apto,
    }))
    // compat: algumas telas esperam "moradores" ao invés de "items"
    const moradores = items.map((x: any) => ({ nome: x.nome, telefone: x.telefone, tipo: x.tipo }))
    return NextResponse.json({ ok: true, items, moradores })
  } catch (e: any) {
    console.error("/api/moradores GET error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = String(user?.tipo || "").toLowerCase()
  if (!["admin", "porteiro", "síndico", "sindico"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => null)
    // Default password for new users: "1234"
    const defaultPassword = "1234"
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(defaultPassword, salt)

    const payload: UsuarioRow = {
      nome: String(body?.nome || "").trim(),
      email: String(body?.email || "").trim().toLowerCase(),
      telefone: sanitizeStr(body?.telefone) || null,
      tipo: sanitizeStr(body?.tipo) || "morador",
      bloco: sanitizeStr(body?.bloco) || null,
      apto: sanitizeStr(body?.apartamento ?? body?.apto) || null,
      senha_hash: hashed,
    }

    if (!payload.nome || !payload.email) {
      return NextResponse.json({ error: "NOME_EMAIL_OBRIGATORIOS", detail: "Nome e e-mail são obrigatórios" }, { status: 400 })
    }
    // Bloco/Apartamento obrigatórios para criar o vínculo
    if (!payload.bloco || !payload.apto) {
      return NextResponse.json({ error: "BLOCO_APARTAMENTO_OBRIGATORIOS", detail: "Bloco e Apartamento são obrigatórios para vincular o morador ao apartamento." }, { status: 400 })
    }

    // Use admin client if available to bypass any RLS or permissions issues
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const client = adminKey && supaUrl
      ? createClient(supaUrl, adminKey, { auth: { persistSession: false } })
      : getSupabaseClient()

    const { data, error } = await client
      .from("usuario")
      .insert(payload)
      .select("id_usuario, nome, email, telefone, tipo, bloco, apto")
      .single()

    if (error) {
      console.error("/api/moradores POST supabase error:", error.message, error)
      // Mapeia violação de UNIQUE de forma precisa (só marca como email se a constraint for de email)
      const msg = (error.message || "").toLowerCase()
      const detail = (error.details || error.hint || "").toLowerCase()
      const isUniqueViolation = error.code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint")
      const mentionsEmail = msg.includes("email") || detail.includes("(email)") || msg.includes("usuario_email")
      if (isUniqueViolation) {
        if (mentionsEmail) {
          return NextResponse.json({ error: "EMAIL_JA_CADASTRADO" }, { status: 409 })
        }
        // Outra constraint UNIQUE — retorne detalhe para UI mostrar a causa real
        return NextResponse.json({ error: "DB_UNIQUE_VIOLATION", detail: error.message || error.details || "" }, { status: 409 })
      }
      return NextResponse.json({ error: "DB_ERROR", detail: error.message || error.hint || "" }, { status: 500 })
    }
    // Após criar o usuário, cria o vínculo em usuario_apartamento
    const userId = (data as any)?.id_usuario as number | undefined
    const blocoStr = String(payload.bloco)
    const aptoRaw = String(payload.apto)

    // Resolve ou cria bloco
    let id_bloco: number | null = null
    {
      const { data: b1, error: be1 } = await client
        .from("bloco")
        .select("id_bloco")
        .eq("nome", blocoStr)
        .maybeSingle()
      if (be1 && be1.message) console.error("/api/moradores POST bloco lookup:", be1.message)
      if (b1 && (b1 as any).id_bloco != null) {
        id_bloco = Number((b1 as any).id_bloco)
      } else {
        const { data: bins, error: be2 } = await client
          .from("bloco")
          .insert({ nome: blocoStr })
          .select("id_bloco")
          .single()
        if (be2) {
          console.error("/api/moradores POST bloco insert:", be2.message)
          return NextResponse.json({ error: "DB_ERROR", detail: be2.message }, { status: 500 })
        }
        id_bloco = Number((bins as any).id_bloco)
      }
    }

    // Resolve ou cria apartamento
    let id_apartamento: number | null = null
    if (id_bloco && userId) {
      const digits = aptoRaw.replace(/\D/g, "")
      const asNumber = digits ? Number(digits) : null
      // Tenta como string primeiro
      let a1Res = await client
        .from("apartamento")
        .select("id_apartamento")
        .eq("numero", aptoRaw)
        .eq("id_bloco", id_bloco)
        .maybeSingle()
      if (a1Res.error && a1Res.error.message) console.error("/api/moradores POST apartamento lookup(string):", a1Res.error.message)
      if (a1Res.data && (a1Res.data as any).id_apartamento != null) {
        id_apartamento = Number((a1Res.data as any).id_apartamento)
      } else {
        // tenta como número (alguns schemas usam numero integer)
        if (asNumber !== null && asNumber !== undefined && String(asNumber) !== aptoRaw) {
          const a2Res = await client
            .from("apartamento")
            .select("id_apartamento")
            .eq("numero", asNumber as any)
            .eq("id_bloco", id_bloco)
            .maybeSingle()
          if (a2Res.error && a2Res.error.message) console.error("/api/moradores POST apartamento lookup(number):", a2Res.error.message)
          if (a2Res.data && (a2Res.data as any).id_apartamento != null) {
            id_apartamento = Number((a2Res.data as any).id_apartamento)
          }
        }
        if (!id_apartamento) {
          // cria
          const toInsertNumero: any = asNumber !== null && asNumber !== undefined ? asNumber : aptoRaw
          const { data: ains, error: ae } = await client
            .from("apartamento")
            .insert({ numero: toInsertNumero, id_bloco })
            .select("id_apartamento")
            .single()
          if (ae) {
            console.error("/api/moradores POST apartamento insert:", ae.message)
            return NextResponse.json({ error: "DB_ERROR", detail: ae.message }, { status: 500 })
          }
          id_apartamento = Number((ains as any).id_apartamento)
        }
      }
    }

    if (!userId || !id_apartamento) {
      return NextResponse.json({ error: "FALHA_VINCULO", detail: "Não foi possível resolver usuário/apartamento para vínculo." }, { status: 500 })
    }

    // data_entrada = agora - 3 horas, formato YYYY-MM-DD HH:mm:ss
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

    const linkIns = await client
      .from("usuario_apartamento")
      .insert({ id_usuario: userId, id_apartamento, data_entrada: ts })
    if (linkIns.error) {
      // Trata duplicidade como sucesso idempotente
      const em = (linkIns.error.message || "").toLowerCase()
      const isDup = linkIns.error.code === "23505" || em.includes("duplicate") || em.includes("unique")
      if (!isDup) {
        console.error("/api/moradores POST vinculo insert:", linkIns.error.message)
        return NextResponse.json({ error: "DB_ERROR", detail: linkIns.error.message }, { status: 500 })
      }
    }

    const item = data
      ? {
          id_usuario: (data as any).id_usuario,
          nome: (data as any).nome,
          email: (data as any).email,
          telefone: (data as any).telefone,
          tipo: (data as any).tipo,
          bloco: (data as any).bloco,
          apartamento: (data as any).apto,
        }
      : null
    return NextResponse.json({ ok: true, item, vinculoCriado: true })
  } catch (e: any) {
    console.error("/api/moradores POST error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = String(user?.tipo || "").toLowerCase()
  if (!["admin", "porteiro", "síndico", "sindico"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => null)
    const originalEmail = String(body?.originalEmail || body?.oldEmail || "").trim().toLowerCase()
    const newEmail = String(body?.email || "").trim().toLowerCase()
    if (!originalEmail && !newEmail) return NextResponse.json({ error: "EMAIL_OBRIGATORIO" }, { status: 400 })
    const identifierEmail = originalEmail || newEmail

    // Use admin client for full control over usuario_apartamento operations
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const client = adminKey && supaUrl
      ? createClient(supaUrl, adminKey, { auth: { persistSession: false } })
      : getSupabaseClient()

    // Get current user data first to detect apartment changes
    const { data: currentUser, error: lookupError } = await client
      .from("usuario")
      .select("id_usuario, nome, email, telefone, tipo, bloco, apto")
      .eq("email", identifierEmail)
      .maybeSingle()

    if (lookupError) {
      console.error("/api/moradores PUT lookup error:", lookupError.message)
      return NextResponse.json({ error: "DB_ERROR", detail: lookupError.message }, { status: 500 })
    }
    if (!currentUser) return NextResponse.json({ error: "USUARIO_NAO_ENCONTRADO" }, { status: 404 })

    const toUpdate: Partial<UsuarioRow> = {}
    if (body?.nome !== undefined) toUpdate.nome = String(body?.nome || "").trim()
    if (body?.telefone !== undefined) toUpdate.telefone = sanitizeStr(body?.telefone) || null
    if (body?.tipo !== undefined) toUpdate.tipo = sanitizeStr(body?.tipo) || null
    if (body?.bloco !== undefined) toUpdate.bloco = sanitizeStr(body?.bloco) || null
    if (body?.apartamento !== undefined || body?.apto !== undefined) toUpdate.apto = sanitizeStr(body?.apartamento ?? body?.apto) || null
    // allow updating the email address itself
    if (body?.email !== undefined && newEmail && newEmail !== identifierEmail) {
      toUpdate.email = newEmail
    }

    // Check if bloco or apartamento changed - if so, we need to handle apartment transition
    const oldBloco = currentUser.bloco
    const oldApto = currentUser.apto
    const newBloco = toUpdate.bloco !== undefined ? toUpdate.bloco : oldBloco
    const newApto = toUpdate.apto !== undefined ? toUpdate.apto : oldApto
    const apartmentChanged = (newBloco !== oldBloco || newApto !== oldApto) && newBloco && newApto

    const { data, error, status } = await client
      .from("usuario")
      .update(toUpdate)
      .eq("email", identifierEmail)
      .select("nome, email, telefone, tipo, bloco, apto")
      .maybeSingle()

    if (error) {
      console.error("/api/moradores PUT supabase error:", error.message, error)
      const msg = (error.message || "").toLowerCase()
      const detail = (error.details || error.hint || "").toLowerCase()
      const isUniqueViolation = error.code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("duplicate") || msg.includes("unique")
      const mentionsEmail = msg.includes("email") || detail.includes("(email)") || msg.includes("usuario_email")
      if (isUniqueViolation) {
        if (mentionsEmail) {
          return NextResponse.json({ error: "EMAIL_JA_CADASTRADO" }, { status: 409 })
        }
        return NextResponse.json({ error: "DB_UNIQUE_VIOLATION", detail: error.message || error.details || "" }, { status: 409 })
      }
      return NextResponse.json({ error: "DB_ERROR", detail: error.message || error.hint || "" }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "USUARIO_NAO_ENCONTRADO" }, { status: 404 })

    // Handle apartment transition if needed
    if (apartmentChanged) {
      const userId = currentUser.id_usuario
      // Generate Brazilian time (UTC-3) - use local methods after adjusting
      const now = new Date()
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)) // Subtract 3 hours from UTC
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      // Use getFullYear() instead of getUTCFullYear() since we already adjusted the time
      const timestamp = `${brazilTime.getFullYear()}-${pad(brazilTime.getMonth() + 1)}-${pad(brazilTime.getDate())} ${pad(brazilTime.getHours())}:${pad(brazilTime.getMinutes())}:${pad(brazilTime.getSeconds())}`

      // 1) Close current apartment vinculos by setting data_saida = NOW()
      const closeResult = await client
        .from("usuario_apartamento")
        .update({ data_saida: timestamp })
        .eq("id_usuario", userId)
        .is("data_saida", null)

      if (closeResult.error) {
        console.error("/api/moradores PUT close vinculos error:", closeResult.error.message)
        // Don't fail the whole operation, but log it
      }

      // 2) Resolve/create new bloco and apartamento IDs
      let id_bloco: number | null = null
      {
        const { data: b1, error: be1 } = await client
          .from("bloco")
          .select("id_bloco")
          .eq("nome", newBloco!)
          .maybeSingle()
        if (be1 && be1.message) console.error("/api/moradores PUT bloco lookup:", be1.message)
        if (b1 && (b1 as any).id_bloco != null) {
          id_bloco = Number((b1 as any).id_bloco)
        } else {
          const { data: bins, error: be2 } = await client
            .from("bloco")
            .insert({ nome: newBloco! })
            .select("id_bloco")
            .single()
          if (be2) {
            console.error("/api/moradores PUT bloco insert:", be2.message)
          } else {
            id_bloco = Number((bins as any).id_bloco)
          }
        }
      }

      let id_apartamento: number | null = null
      if (id_bloco) {
        const digits = newApto!.replace(/\D/g, "")
        const asNumber = digits ? Number(digits) : null
        // Try string first
        let a1Res = await client
          .from("apartamento")
          .select("id_apartamento")
          .eq("numero", newApto!)
          .eq("id_bloco", id_bloco)
          .maybeSingle()
        if (a1Res.error && a1Res.error.message) console.error("/api/moradores PUT apartamento lookup(string):", a1Res.error.message)
        if (a1Res.data && (a1Res.data as any).id_apartamento != null) {
          id_apartamento = Number((a1Res.data as any).id_apartamento)
        } else {
          // Try number if different from string
          if (asNumber !== null && asNumber !== undefined && String(asNumber) !== newApto!) {
            const a2Res = await client
              .from("apartamento")
              .select("id_apartamento")
              .eq("numero", asNumber as any)
              .eq("id_bloco", id_bloco)
              .maybeSingle()
            if (a2Res.error && a2Res.error.message) console.error("/api/moradores PUT apartamento lookup(number):", a2Res.error.message)
            if (a2Res.data && (a2Res.data as any).id_apartamento != null) {
              id_apartamento = Number((a2Res.data as any).id_apartamento)
            }
          }
          if (!id_apartamento) {
            // Create new apartamento
            const toInsertNumero: any = asNumber !== null && asNumber !== undefined ? asNumber : newApto!
            const { data: ains, error: ae } = await client
              .from("apartamento")
              .insert({ numero: toInsertNumero, id_bloco })
              .select("id_apartamento")
              .single()
            if (ae) {
              console.error("/api/moradores PUT apartamento insert:", ae.message)
            } else {
              id_apartamento = Number((ains as any).id_apartamento)
            }
          }
        }
      }

      // 3) Create new vinculos with data_entrada = NOW()
      if (id_apartamento) {
        const linkResult = await client
          .from("usuario_apartamento")
          .insert({ id_usuario: userId, id_apartamento, data_entrada: timestamp })
        if (linkResult.error) {
          // Check if it's a duplicate - that's OK
          const em = (linkResult.error.message || "").toLowerCase()
          const isDup = linkResult.error.code === "23505" || em.includes("duplicate") || em.includes("unique")
          if (!isDup) {
            console.error("/api/moradores PUT new vinculo insert:", linkResult.error.message)
          }
        }
      }
    }

    const item = data
      ? {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo,
          bloco: data.bloco,
          apartamento: data.apto,
        }
      : null
    return NextResponse.json({ ok: true, item, status, apartmentTransitioned: apartmentChanged })
  } catch (e: any) {
    console.error("/api/moradores PUT error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = String(user?.tipo || "").toLowerCase()
  if (!["admin", "porteiro", "síndico", "sindico"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const url = new URL(req.url)
    const email = sanitizeStr(url.searchParams.get("email")) || undefined
    if (!email) return NextResponse.json({ error: "EMAIL_OBRIGATORIO" }, { status: 400 })

    // Use admin client if available to bypass RLS; otherwise fall back to anon client
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const client = adminKey && supaUrl
      ? createClient(supaUrl, adminKey, { auth: { persistSession: false } })
      : getSupabaseClient()

    // 1) Descobre o id_usuario pelo e-mail (case-sensitive depois case-insensitive)
    let userId: number | null = null
    {
      const { data: u1, error: e1 } = await client
        .from("usuario")
        .select("id_usuario, email")
        .eq("email", email)
        .maybeSingle()
      if (e1 && e1.message) {
        console.error("/api/moradores DELETE lookup error (eq):", e1.message)
      }
      if (u1 && (u1 as any).id_usuario != null) {
        userId = Number((u1 as any).id_usuario)
      } else {
        const { data: u2, error: e2 } = await client
          .from("usuario")
          .select("id_usuario, email")
          .ilike("email", email)
          .limit(1)
        if (e2 && e2.message) {
          console.error("/api/moradores DELETE lookup error (ilike):", e2.message)
        }
        if (u2 && Array.isArray(u2) && u2.length > 0) {
          userId = Number((u2[0] as any).id_usuario)
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "USUARIO_NAO_ENCONTRADO" }, { status: 404 })
    }

    // 2) Remove vínculos na tabela usuario_apartamento (não falha se não houver)
    const delLink = await client
      .from("usuario_apartamento")
      .delete()
      .eq("id_usuario", userId)
    if (delLink.error) {
      console.error("/api/moradores DELETE vinculo error:", delLink.error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: delLink.error.message }, { status: 500 })
    }

    // 3) Exclui o usuário em si
    const delUser = await client
      .from("usuario")
      .delete()
      .eq("id_usuario", userId)
      .select("id_usuario")

    if (delUser.error) {
      console.error("/api/moradores DELETE usuario error:", delUser.error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: delUser.error.message }, { status: 500 })
    }
    // Se nenhum registro foi apagado aqui, pode ter sido removido por outra ação; tratamos como sucesso idempotente
    return NextResponse.json({ ok: true, removed: (delUser.data || []).length }, { status: 200 })
  } catch (e: any) {
    console.error("/api/moradores DELETE error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}
