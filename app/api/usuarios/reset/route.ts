import { NextResponse } from "next/server"
import { Pool, PoolConfig } from "pg"
import bcrypt from "bcryptjs"

function makePgConfig(): PoolConfig {
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "postgres",
    ssl:
      process.env.PGSSL === "true" || process.env.POSTGRES_SSLMODE === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  }
}

let _pool: Pool | null = null
const getPool = () => (_pool ??= new Pool(makePgConfig()))

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email || "").trim()
    const password = String(body?.password || "")

    if (!email || !password) {
      return NextResponse.json({ error: "email e password são obrigatórios" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    const pool = getPool()
    const client = await pool.connect()
    try {
      const r = await client.query(
        `UPDATE usuario
            SET senha_hash = $1
          WHERE lower(email) = lower($2)
          RETURNING email`,
        [hashed, email]
      )
      if (!r.rowCount) {
        return NextResponse.json({ error: "E-mail não cadastrado." }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    } finally {
      try { client.release() } catch (e) { console.error("release error:", e) }
    }
  } catch (e: any) {
    console.error("API /api/usuarios/reset ERROR:", e)
    return NextResponse.json({ error: "db error", detail: e?.message ?? String(e) }, { status: 500 })
  }
}