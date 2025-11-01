import { NextResponse } from "next/server"
import { Pool } from "pg"
import { getUserFromRequest } from "../../../lib/server/auth"

function makePgConfig() {
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

let _pool: any = null
const getPool = () => (_pool ??= new Pool(makePgConfig()))

export async function GET(req: Request) {
  // Require authentication and validate ownership
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email = (searchParams.get("email") || "").trim()
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

  // Check if user can access this email's data
  const userRole = String(user?.tipo || "").toLowerCase()
  const isPrivileged = ["admin", "porteiro", "síndico", "sindico"].includes(userRole)
  
  // Only allow if privileged or requesting own email
  if (!isPrivileged && String(user?.email || "").toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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