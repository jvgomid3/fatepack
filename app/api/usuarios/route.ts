import { NextResponse } from "next/server"
import { Pool, PoolConfig } from "pg"

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get("email") || "").trim()
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

  try {
    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query(`SET TIME ZONE 'America/Sao_Paulo'`)
      const r = await client.query(
        `SELECT email,
                telefone,
                bloco,
                apto,
                nome
           FROM usuario
          WHERE lower(email) = lower($1)
          LIMIT 1`,
        [email]
      )
      if (!r.rowCount) return NextResponse.json({ error: "E-mail não cadastrado." }, { status: 404 })
      return NextResponse.json({ ok: true, user: r.rows[0] }, { status: 200 })
    } finally {
      try { client.release() } catch (e) { console.error("Error releasing client:", e) }
    }
  } catch (e: any) {
    console.error("API /api/usuarios ERROR (connection/query):", e)
    return NextResponse.json(
      {
        error: "db error",
        detail: e?.message ?? String(e),
        stack: typeof e?.stack === "string" ? e.stack.split("\n").slice(0, 20) : undefined,
      },
      { status: 500 }
    )
  }
}