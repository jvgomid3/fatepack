import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
})

const TABLE = process.env.DB_USERS_TABLE || "usuario" // ajuste se necessário

export async function POST(req: Request) {
  try {
    const { email, senha, codigo } = await req.json()
    const emailNorm = String(email || "").trim().toLowerCase()
    const pass = String(senha || "")
    const code = String(codigo || "")

    if (!emailNorm || !pass || !code) return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })
    if (code !== "1234") return NextResponse.json({ error: "Código inválido" }, { status: 400 })

    const hash = await bcrypt.hash(pass, 10)

    const client = await pool.connect()
    try {
      const q = await client.query(
        `UPDATE ${TABLE}
            SET senha_hash = $1
          WHERE lower(email) = $2
          RETURNING id_usuario, nome, email`,
        [hash, emailNorm]
      )
      const row = q.rows?.[0]
      if (!row) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
      return NextResponse.json({ ok: true, nome: row.nome, email: row.email })
    } finally {
      client.release()
    }
  } catch (e: any) {
    console.error("API /api/redefinir-senha error:", e)
    return NextResponse.json({ error: e?.message || "Erro no servidor" }, { status: 500 })
  }
}