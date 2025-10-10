export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getUserFromRequest } from "../../../../lib/server/auth"
import { getSupabaseAdmin } from "../../../../lib/server/supabaseAdmin"

// Schema expected for subscription payload from client
// {
//   endpoint: string,
//   keys: { p256dh: string, auth: string }
// }

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req as any)
  if (!user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const endpoint = String(body?.endpoint || "").trim()
  const p256dh = String(body?.keys?.p256dh || "").trim()
  const auth = String(body?.keys?.auth || "").trim()
  if (!endpoint || !p256dh || !auth) {
    return new Response(JSON.stringify({ error: "INVALID_SUBSCRIPTION" }), { status: 400 })
  }

  try {
    const supa = getSupabaseAdmin()
    // upsert by endpoint+user_id to avoid duplicates
    const { data, error } = await supa
      .from("push_subscription")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          user_id: Number(user.id),
          created_at: new Date().toISOString(),
        },
        { onConflict: "endpoint,user_id" }
      )
      .select("id, endpoint")
      .single()
    if (error) throw error
    return new Response(JSON.stringify({ ok: true, id: data?.id }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "DB_ERROR" }), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req as any)
  if (!user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const endpoint = String(searchParams.get("endpoint") || "").trim()
  if (!endpoint) {
    return new Response(JSON.stringify({ error: "MISSING_ENDPOINT" }), { status: 400 })
  }
  try {
    const { error } = await getSupabaseAdmin()
      .from("push_subscription")
      .delete()
      .match({ endpoint, user_id: Number(user.id) })
    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "DB_ERROR" }), { status: 500 })
  }
}
