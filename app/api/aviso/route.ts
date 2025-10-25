export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getUserFromRequest } from "../../../lib/server/auth"
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin"
import { sendPush } from "../../../lib/server/push"

const TABLE = "aviso"

function pad(n: number) { return String(n).padStart(2, "0") }

// Retorna timestamp no fuso de São Paulo (America/Sao_Paulo) no formato YYYY-MM-DD HH:mm:ss
function nowInSaoPauloTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value || 0)
  const yyyy = get("year")
  const mm = get("month")
  const dd = get("day")
  const hh = get("hour")
  const mi = get("minute")
  const ss = get("second")
  return `${yyyy}-${pad(mm)}-${pad(dd)} ${pad(hh)}:${pad(mi)}:${pad(ss)}`
}

// Converte input datetime-local (ex: 2025-10-05T16:52 ou 2025-10-05T16:52:22) para 'YYYY-MM-DD HH:mm:ss'
function localInputToTimestamp(v: string): string {
  if (!v) return ""
  // normaliza separador T para espaço
  const s = v.replace("T", " ")
  // acrescenta :00 se não tiver segundos
  return /:\d{2}$/.test(s) ? `${s}:00` : s
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const activeParam = searchParams.get("active")
    if (activeParam === "1") {
      const now = nowInSaoPauloTimestamp()
      const { data, error } = await getSupabaseAdmin()
        .from(TABLE)
        .select("id_aviso, titulo, mensagem, inicio, fim")
        .lte("inicio", now)
        .gte("fim", now)
        .order("inicio", { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ aviso: data?.[0] || null }), { status: 200 })
    } else if (activeParam === "all") {
      const now = nowInSaoPauloTimestamp()
      const { data, error } = await getSupabaseAdmin()
        .from(TABLE)
        .select("id_aviso, titulo, mensagem, inicio, fim")
        .lte("inicio", now)
        .gte("fim", now)
        .order("inicio", { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ avisos: data || [] }), { status: 200 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("id_aviso, titulo, mensagem, inicio, fim")
      .order("inicio", { ascending: false })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ avisos: data || [] }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "GET failed" }), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  const role = String(user?.tipo || "").toLowerCase()
  if (role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const titulo = String(body?.titulo || "").trim()
    const mensagem = String(body?.mensagem || "").trim()
    const fimInput = String(body?.fim || "").trim() // esperado: 'YYYY-MM-DD HH:mm[:ss]' ou 'YYYY-MM-DDTHH:mm'

    if (!titulo || !mensagem || !fimInput) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: titulo, mensagem, fim" }), { status: 400 })
    }

    const inicio = nowInSaoPauloTimestamp()
    const fim = localInputToTimestamp(fimInput)

    const supa = getSupabaseAdmin()
    const { data, error } = await supa
      .from(TABLE)
      .insert([{ titulo, mensagem, inicio, fim }])
      .select("id_aviso, titulo, mensagem, inicio, fim")
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    // Broadcast push notification to all subscribers
    try {
      const { data: subs, error: es } = await supa
        .from("push_subscription")
        .select("endpoint, p256dh, auth")
      if (!es && Array.isArray(subs) && subs.length) {
        const payload = {
          title: "⚠️ Novo aviso",
          body: titulo,
          url: "/inicio",
          tag: "new-aviso",
        }
        await Promise.allSettled(
          subs.map((s: any) => sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
        )
      }
    } catch {}
    return new Response(JSON.stringify({ aviso: data }), { status: 201 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "POST failed" }), { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = Number(body?.id_aviso || body?.id)
    if (!id) return new Response(JSON.stringify({ error: "id_aviso é obrigatório" }), { status: 400 })

    const action = String(body?.action || "").trim().toLowerCase()
    if (action === "deactivate") {
      // Define fim para agora (Sao Paulo). Para efeito imediato no cliente, retornamos o registro atualizado.
      const fim = nowInSaoPauloTimestamp()
      const { data, error } = await getSupabaseAdmin()
        .from(TABLE)
        .update({ fim })
        .eq("id_aviso", id)
        .select("id_aviso, titulo, mensagem, inicio, fim")
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      return new Response(JSON.stringify({ aviso: data }), { status: 200 })
    }

    // Edição de campos
    const patch: any = {}
    if (typeof body?.titulo === "string") patch.titulo = String(body.titulo).trim()
    if (typeof body?.mensagem === "string") patch.mensagem = String(body.mensagem).trim()
    if (typeof body?.fim === "string") patch.fim = localInputToTimestamp(String(body.fim))

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: "Nada para atualizar" }), { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .update(patch)
      .eq("id_aviso", id)
      .select("id_aviso, titulo, mensagem, inicio, fim")
      .single()
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    return new Response(JSON.stringify({ aviso: data }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "PATCH failed" }), { status: 500 })
  }
}
