import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getSupabaseAdmin } from "../../../lib/server/supabaseAdmin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { email, senha, codigo } = await req.json()
    const emailNorm = String(email || "").trim().toLowerCase()
    const pass = String(senha || "")
    const code = String(codigo || "")

  if (!emailNorm || !pass || !code) return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })
  if (code !== "1234") return NextResponse.json({ error: "❌ Código inválido." }, { status: 400 })

    const hash = await bcrypt.hash(pass, 10)

    // Atualiza no Supabase pela coluna email (case-sensitive).
    // Emails são salvos em minúsculo no app; se necessário, converta seu dataset.
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("usuario")
      .update({ senha_hash: hash })
      .eq("email", emailNorm)
      .select("nome, email")
      .limit(1)

    if (error) {
      console.error("/api/redefinir-senha supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
    }
    if (!data || !data.length) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, nome: data[0].nome, email: data[0].email })
  } catch (e: any) {
    console.error("API /api/redefinir-senha error:", e?.message || e)
    return NextResponse.json({ error: e?.message || "Erro no servidor" }, { status: 500 })
  }
}