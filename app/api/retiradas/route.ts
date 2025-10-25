import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin"
import { getUserFromRequest } from "../../../lib/server/auth"

export const dynamic = "force-dynamic"

const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

// Gera timestamp no fuso de São Paulo (ISO com offset -03:00, igual /api/encomendas)
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
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-03:00`
}

function formatBRDateTimeSaoPaulo(iso: string): string {
  const d = new Date(iso)
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

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = String(user?.tipo || "").toLowerCase()
  if (!["admin", "porteiro", "síndico", "sindico"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const id_encomenda = Number(body?.id_encomenda)
    const nome_retirou_raw = String(body?.nome_retirou || "").trim()
    if (!id_encomenda || !nome_retirou_raw) {
      return NextResponse.json({ error: "id_encomenda e nome_retirou são obrigatórios" }, { status: 400 })
    }
    const nome_retirou = capFirst(nome_retirou_raw).slice(0, 120)
    const ts = nowInSaoPauloISO()

    // Insere no Supabase
    const { data, error } = await getSupabaseAdmin()
      .from("retirada")
      .insert({ id_encomenda, nome_retirou, data_retirada: ts })
      .select("id_retirada, id_encomenda, nome_retirou, data_retirada")
      .single()
    if (error) {
      // provável violação de FK quando encomenda não existe
      const status = String(error.code).startsWith("23") ? 400 : 500
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status })
    }

    const data_retirada_fmt = formatBRDateTimeSaoPaulo(String(data?.data_retirada))
    return NextResponse.json({ ok: true, ...data, data_retirada_fmt }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao registrar retirada", detail: e?.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req)
    // For GET of retiradas, require admin role
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = String(user?.tipo || "").toLowerCase()
    if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data, error } = await getSupabaseAdmin()
      .from("retirada")
      .select("id_retirada, id_encomenda, nome_retirou, data_retirada")
      .order("data_retirada", { ascending: false })
      .order("id_retirada", { ascending: false })
    if (error) throw error

    const rows = (data || []).map((r: any) => ({
      ...r,
      data_retirada_fmt: formatBRDateTimeSaoPaulo(String(r.data_retirada)),
    }))
    return NextResponse.json({ ok: true, rows }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao buscar retiradas", detail: e?.message }, { status: 500 })
  }
}