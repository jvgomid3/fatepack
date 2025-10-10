export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/server/auth"
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin"
import { sendPush } from "../../../../lib/server/push"

// GET: list current user's push subscriptions (debug)
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req as any)
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("push_subscription")
      .select("id, endpoint, created_at")
      .eq("user_id", Number(user.id))
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ ok: true, count: (data || []).length, items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "DB_ERROR" }, { status: 500 })
  }
}

// POST: send a test push to current user's subscriptions (debug)
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req as any)
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  try {
    const supa = getSupabaseAdmin()
    const { data: subs, error } = await supa
      .from("push_subscription")
      .select("endpoint, p256dh, auth")
      .eq("user_id", Number(user.id))
    if (error) throw error
    if (!subs || !subs.length) return NextResponse.json({ ok: false, message: "NO_SUBSCRIPTIONS" }, { status: 404 })

    const payload = {
      title: "🔔 Teste de Push",
      body: "Se você vê isso, o push está funcionando.",
      url: "/inicio",
      tag: "test-push",
    }

    const results = await Promise.allSettled(
      subs.map((s: any) => sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
    )
    const summary = {
      total: subs.length,
      fulfilled: results.filter((r) => r.status === "fulfilled").length,
      rejected: results.filter((r) => r.status === "rejected").length,
      errors: results
        .map((r, i) => ({ idx: i, status: r.status, reason: (r as any)?.reason?.message }))
        .filter((e) => e.status === "rejected"),
    }
    return NextResponse.json({ ok: true, summary })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "PUSH_ERROR" }, { status: 500 })
  }
}
