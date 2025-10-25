import { NextResponse } from "next/server"
import { getSupabaseClient } from "../../../../lib/supabaseClient"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "email é obrigatório" }, { status: 400 })

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("usuario")
      .select("id_usuario")
      .ilike("email", email)
      .limit(1)

    if (error) {
      console.error("/api/auth/verificar-email supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 })
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ exists: true })
  } catch (e: any) {
    console.error("/api/auth/verificar-email error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}
