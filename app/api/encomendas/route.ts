export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/server/auth"
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin"
import { sendPush } from "../../../lib/server/push"
import { createErrorResponse } from "../../../lib/server/errorHandler"

const TABLE = "encomenda"

// Formata timestamp para formato brasileiro (dd/MM/yyyy HH:mm)
function formatBRDateTimeSaoPaulo(iso: string): string {
  // Se o timestamp vier sem timezone (ex: "2025-11-01 21:43:00"),
  // assumimos que já está em horário de São Paulo
  const d = new Date(iso)
  
  // Se a string não tem 'T' ou 'Z' ou offset, é timestamp naive - tratamos como SP
  const hasTimezone = iso.includes('T') || iso.includes('Z') || iso.includes('+') || iso.includes('-03')
  
  if (!hasTimezone) {
    // Timestamp naive: parsear como se fosse SP adicionando offset
    const [datePart, timePart] = iso.split(' ')
    const isoWithOffset = `${datePart}T${timePart || '00:00:00'}-03:00`
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(isoWithOffset))
  }
  
  // Se tem timezone, usar formatação com timeZone
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

// Gera timestamp no fuso de São Paulo SEM offset (para Postgres salvar como está)
// Retorna formato: "2025-11-01 21:43:00" (hora local de SP, sem timezone)
function nowInSaoPauloISO(): string {
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
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value])) as Record<string, string>
  // Retorna sem offset para Postgres armazenar o valor literal (21:43 vira 21:43 no banco)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const isAdmin = String(user.tipo || "").toLowerCase() === "admin"
    const baseSelect = `id_encomenda, empresa_entrega, data_recebimento, id_apartamento, bloco, apartamento, nome, recebido_por,
      retirada:retirada!retirada_id_encomenda_fkey(id_retirada, nome_retirou, data_retirada)`

    if (isAdmin) {
        const { data, error } = await getSupabaseAdmin()
        .from(TABLE)
        .select(baseSelect)
        .order("data_recebimento", { ascending: false, nullsFirst: false })
        .order("id_encomenda", { ascending: false })
      if (error) throw error
      // flatten latest retirada by sorting client-side (Supabase returns arrays for one-to-many by default if configured)
      return NextResponse.json(
        (data || []).map((e: any) => {
          const dataRetirada = Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].data_retirada : null
          return {
            id: e.id_encomenda,
            empresa_entrega: e.empresa_entrega,
            data_recebimento: e.data_recebimento,
            id_apartamento: e.id_apartamento,
            bloco: e.bloco,
            apartamento: e.apartamento,
            nome: e.nome,
            recebido_por: e.recebido_por,
            retirado_por: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].nome_retirou : null,
            data_retirada: dataRetirada,
            // Adicionar data_retirada formatado (assumindo que já está em UTC-3 no banco)
            data_retirada_fmt: dataRetirada ? formatBRDateTimeSaoPaulo(String(dataRetirada)) : null,
          }
        })
      )
    }

    // Implementa janela de visibilidade via usuario_apartamento (data_entrada/data_saida)
    const userId = Number(user.id)
    // 1) Buscar vínculos do usuário
    const { data: vinculos, error: errUa } = await getSupabaseAdmin()
      .from("usuario_apartamento")
      .select("id_apartamento, data_entrada, data_saida")
      .eq("id_usuario", userId)
    if (errUa) throw errUa
    if (!vinculos || !vinculos.length) {
      return NextResponse.json([])
    }

    const aptoIds = Array.from(new Set(vinculos.map((v: any) => v.id_apartamento).filter(Boolean)))
    if (!aptoIds.length) {
      return NextResponse.json([])
    }

    // 2) Buscar encomendas desses apartamentos e ordenar
    const { data: encomendas, error: errEnc } = await getSupabaseAdmin()
      .from(TABLE)
      .select(baseSelect)
      .in("id_apartamento", aptoIds)
      .order("data_recebimento", { ascending: false, nullsFirst: false })
      .order("id_encomenda", { ascending: false })
    if (errEnc) throw errEnc

    // 3) Filtrar por intervalo do vínculo (data_entrada <= data_recebimento <= coalesce(data_saida, now))
    const now = new Date()
    const parseDate = (v: any) => {
      try { return v ? new Date(v) : null } catch { return null }
    }
    const fitsWindow = (e: any) => {
      const dr = parseDate(e.data_recebimento)
      if (!dr) return false
      const vForApto = (vinculos || []).filter((v: any) => Number(v.id_apartamento) === Number(e.id_apartamento))
      for (const v of vForApto) {
        const de = parseDate(v.data_entrada)
        const ds = parseDate(v.data_saida)
        if (!de) continue
        if (dr >= de && (ds ? dr <= ds : dr <= now)) return true
      }
      return false
    }

    const filtered = (encomendas || []).filter(fitsWindow)
    return NextResponse.json(
      filtered.map((e: any) => ({
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
      }))
    )
  } catch (e: any) {
    console.error("GET /api/encomendas:", e?.message)
    return NextResponse.json(createErrorResponse(e), { status: 500 })
  }
}

async function findIdApartamento(bloco: string, apt: string) {
  // tenta encontrar via bloco.nome e apartamento.numero
    const { data: b, error: eb } = await getSupabaseAdmin()
    .from("bloco")
    .select("id_bloco, nome")
    .or(`nome.eq.${bloco},nome.eq.${String(Number(bloco))}`)
    .limit(1)
    .maybeSingle()
  if (eb) throw eb
  if (!b) return null

  const { data: a, error: ea } = await getSupabaseAdmin()
    .from("apartamento")
    .select("id_apartamento, numero, id_bloco")
    .eq("id_bloco", b.id_bloco)
    .or(`numero.eq.${apt},numero.eq.${String(Number(apt))}`)
    .limit(1)
    .maybeSingle()
  if (ea) throw ea
  return a?.id_apartamento ?? null
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  const role = String(user?.tipo || "").toLowerCase()
  const dev = process.env.NODE_ENV !== "production"

  if (!user || !["admin", "porteiro", "síndico", "sindico"].includes(role)) {
    return NextResponse.json(
      { error: "Unauthorized", reason: !user ? "NO_TOKEN_OR_INVALID" : "ROLE_NOT_ALLOWED", role: dev ? role : undefined },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const empresa = String(body.empresa_entrega ?? body.empresa ?? "").trim()
  const bloco = String(body.bloco ?? "").trim().padStart(2, "0")
  const apartamento = String(body.apartamento ?? body.apto ?? "").trim().padStart(2, "0")
  const nomeInput = String(body.nome ?? "").trim()
  const recebidoPor = String(body.recebido_por ?? user.nome ?? "").trim()

  // Input validation
  if (!empresa || !bloco || !apartamento) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }
  
  // Validate empresa length (prevent overly long strings)
  if (empresa.length > 100) {
    return NextResponse.json({ error: "Nome da empresa muito longo (máx 100 caracteres)" }, { status: 400 })
  }
  
  // Validate bloco and apartamento are numeric after padding
  if (!/^\d+$/.test(bloco) || !/^\d+$/.test(apartamento)) {
    return NextResponse.json({ error: "Bloco e apartamento devem ser numéricos" }, { status: 400 })
  }
  
  // Validate nome if provided
  if (nomeInput && nomeInput.length > 200) {
    return NextResponse.json({ error: "Nome muito longo (máx 200 caracteres)" }, { status: 400 })
  }

  try {
    let idApto = await findIdApartamento(bloco, apartamento)
    // Fallback: tenta resolver via usuario_apartamento (caso bloco/apartamento estejam inconsistentes)
    if (!idApto) {
      const { data: ulist, error: eul } = await getSupabaseAdmin()
        .from("usuario")
        .select("id_usuario")
        .in("bloco", [bloco, String(Number(bloco))])
        .in("apto", [apartamento, String(Number(apartamento))])
        .limit(1)
      if (eul) throw eul
      const uId = ulist && ulist.length ? ulist[0].id_usuario : null
      if (uId) {
        const { data: ua, error: eua } = await getSupabaseAdmin()
          .from("usuario_apartamento")
          .select("id_apartamento")
          .eq("id_usuario", uId)
          .limit(1)
        if (eua) throw eua
        idApto = ua && ua.length ? ua[0].id_apartamento : null
      }
    }
    if (!idApto) {
      return NextResponse.json(
        { error: "APARTAMENTO_NOT_FOUND", bloco, apartamento },
        { status: 400 }
      )
    }

    // Resolve destinatário via usuario_apartamento
    const { data: uaRows, error: erUa } = await getSupabaseAdmin()
      .from("usuario_apartamento")
      .select("id_usuario")
      .eq("id_apartamento", idApto)
    if (erUa) throw erUa
    const residentIds = (uaRows || []).map((r: any) => r.id_usuario)
    if (!residentIds.length) {
      return NextResponse.json(
        { error: "NO_USER_FOR_APARTMENT", bloco, apartamento },
        { status: 400 }
      )
    }

    const { data: users, error: erUsers } = await getSupabaseAdmin()
      .from("usuario")
      .select("id_usuario, nome")
      .in("id_usuario", residentIds)
    if (erUsers) throw erUsers

    let destinatario = ""
    if (nomeInput) {
      // livre: usa o nome informado, sem exigir que seja um dos moradores
      destinatario = nomeInput
    } else if ((users || []).length === 1) {
      // fallback: único morador
      destinatario = String(users![0].nome || "")
    } else {
      // múltiplos moradores e nenhum nome fornecido -> peça para especificar
      return NextResponse.json(
        {
          error: "AMBIGUOUS_APARTMENT",
          bloco,
          apartamento,
          residents: (users || []).map((r: any) => r?.nome).filter(Boolean),
        },
        { status: 400 }
      )
    }

    const supa = getSupabaseAdmin()
    const { data: inserted, error: ei } = await supa
      .from(TABLE)
      .insert({
        empresa_entrega: empresa,
        // Armazena no horário de São Paulo (com offset -03:00) para evitar adiantar 3h
        data_recebimento: nowInSaoPauloISO(),
        id_apartamento: idApto,
        bloco,
        apartamento,
        nome: destinatario,
        recebido_por: recebidoPor,
      })
      .select("id_encomenda")
      .single()
    if (ei) throw ei
    // Fire-and-forget: notify all residents of this apartment that a new parcel arrived
    try {
      const { data: subs, error: es } = await supa
        .from("push_subscription")
        .select("endpoint, p256dh, auth, user_id")
        .in("user_id", residentIds)
      if (!es && Array.isArray(subs) && subs.length) {
        const payload = {
          title: "📦 Nova encomenda",
          body: `Uma nova encomenda para ${destinatario}.`,
          url: "/encomendas",
          tag: "new-encomenda",
        }
        const settled = await Promise.allSettled(
          subs.map((s: any) =>
            sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
          )
        )
        // Log any failures to aid debugging (expired/invalid subscriptions etc.)
        try {
          const failures = settled
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.status === "rejected")
            .map(({ r, i }) => ({ index: i, reason: (r as any).reason }))
          if (failures.length) {
            console.error("Push send failures for new encomenda:", failures)
          }
        } catch (logErr) {
          // ignore logging errors
        }
      }
    } catch (notifyErr) {
      // ignore push errors
    }
    return NextResponse.json({ ok: true, id: inserted?.id_encomenda, destinatario })
  } catch (e: any) {
    console.error("POST /api/encomendas:", e?.message)
    return NextResponse.json(createErrorResponse(e), { status: 500 })
  }
}