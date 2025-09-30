// @ts-nocheck
import { NextResponse } from "next/server"
import pkg from "pg"
const { Pool } = pkg as any

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

let _pool: Pool | null = null
const getPool = () => (_pool ??= new Pool(makePgConfig()))

export async function GET(req: Request) {
  const url = new URL(req.url)
  const bloco = (url.searchParams.get("bloco") || url.searchParams.get("block") || "").toString().trim()
  const apto = (url.searchParams.get("apto") || url.searchParams.get("apartamento") || url.searchParams.get("apartment") || "").toString().trim()

  if (!bloco || !apto) {
    return NextResponse.json({ error: "Parâmetros bloco e apto são obrigatórios" }, { status: 400 })
  }

  try {
    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query(`SET TIME ZONE 'America/Sao_Paulo'`)
      const q = await client.query(
        `SELECT nome, telefone, tipo
           FROM usuario
          WHERE trim(lower(bloco)) = trim(lower($1))
            AND trim(apto::text) = trim($2)
          ORDER BY nome ASC`,
        [bloco, apto]
      )
      const rows = q.rows?.map((r: any) => ({
        nome: r.nome,
        telefone: r.telefone,
        tipo: r.tipo,
      })) || []
      return NextResponse.json({ ok: true, moradores: rows })
    } finally {
      try { client.release() } catch {}
    }
  } catch (e: any) {
    console.error("/api/usuarios/por-apto error:", e)
    return NextResponse.json({ error: "DB_ERROR", detail: e?.message ?? String(e) }, { status: 500 })
  }
}
