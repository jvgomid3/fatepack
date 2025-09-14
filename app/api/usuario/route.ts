import { NextResponse } from "next/server"
import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
})

const TABLE = process.env.DB_USERS_TABLE || "usuario" // ajuste se necessário

export async function GET(req: Request) {
  const url = new URL(req.url)
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase()
  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 })

  let client
  try {
    client = await pool.connect()
    const q = await client.query(
      `SELECT id_usuario, nome, email, telefone, tipo, bloco, apto
         FROM ${TABLE}
        WHERE lower(email) = $1
        LIMIT 1`,
      [email]
    )
    const row = q.rows[0]
    if (!row) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

    // normaliza chave "apartamento" para o front atual
    return NextResponse.json({
      id: row.id_usuario,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      tipo: row.tipo,
      bloco: row.bloco,
      apartamento: row.apto,
    })
  } catch (e: any) {
    console.error("API /api/usuario error:", { message: e?.message, code: e?.code, detail: e?.detail })
    return NextResponse.json({ error: "DB_ERROR", message: e?.message, code: e?.code, detail: e?.detail }, { status: 500 })
  } finally {
    client?.release?.()
  }
}