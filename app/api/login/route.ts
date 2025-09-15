export const runtime = "nodejs"

import "server-only"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import pkg from "pg"
import { signToken } from "../../../lib/server/auth"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
})

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || ""
  if (ct.includes("application/json")) {
    try { return await req.json() } catch { return {} }
  }
  try {
    const fd = await req.formData()
    return {
      email: fd.get("email") || fd.get("loginEmail") || "",
      senha: fd.get("senha") || fd.get("password") || fd.get("loginPassword") || "",
    }
  } catch {
    return {}
  }
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req)
    const email = String(body?.email || "").trim().toLowerCase()
    const senha = String(body?.senha || "")

    if (!email || !senha) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      const r = await client.query(
        `SELECT id_usuario, nome, email, senha_hash, telefone, tipo, bloco, apto
           FROM usuario
          WHERE lower(email) = $1
          LIMIT 1`,
        [email]
      )
      const user = r.rows[0]
      if (!user) return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })

      const ok = await bcrypt.compare(senha, user.senha_hash || "")
      if (!ok) return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })

      const payload = { id: user.id_usuario, nome: user.nome, email: user.email, tipo: user.tipo, bloco: user.bloco, apto: user.apto }
      const token = signToken(payload)
      return NextResponse.json({ token, ...payload }, { status: 200 })
    } finally {
      client.release()
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno no login" }, { status: 500 })
  }
}