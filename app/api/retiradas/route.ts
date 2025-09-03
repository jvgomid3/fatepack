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

export const dynamic = "force-dynamic"

const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

export async function POST(req: Request) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await req.json().catch(() => ({}))
    const id_encomenda = Number(body?.id_encomenda)
    const nome_retirou_raw = String(body?.nome_retirou || "").trim()
    if (!id_encomenda || !nome_retirou_raw) {
      return NextResponse.json({ error: "id_encomenda e nome_retirou são obrigatórios" }, { status: 400 })
    }
    const nome_retirou = capFirst(nome_retirou_raw).slice(0, 120)

    await client.query("BEGIN")
    await client.query(`SET TIME ZONE 'America/Sao_Paulo'`)

    const chk = await client.query("SELECT 1 FROM encomenda WHERE id_encomenda = $1", [id_encomenda])
    if (!chk.rowCount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Encomenda não encontrada" }, { status: 404 })
    }

    const r = await client.query(
      `INSERT INTO retirada (id_encomenda, nome_retirou, data_retirada)
       VALUES ($1, $2, now())
       RETURNING id_retirada, id_encomenda, nome_retirou,
                 data_retirada,
                 to_char(data_retirada, 'DD/MM/YYYY HH24:MI') AS data_retirada_fmt`,
      [id_encomenda, nome_retirou]
    )

    await client.query("COMMIT")
    return NextResponse.json({ ok: true, ...r.rows[0] }, { status: 201 })
  } catch (e: any) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Falha ao registrar retirada", detail: e?.message }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function GET() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query(`SET TIME ZONE 'America/Sao_Paulo'`)
    const r = await client.query(
      `SELECT id_retirada, id_encomenda, nome_retirou, data_retirada,
              to_char(data_retirada, 'DD/MM/YYYY HH24:MI') AS data_retirada_fmt
         FROM retirada
        ORDER BY data_retirada DESC, id_retirada DESC`
    )
    return NextResponse.json({ ok: true, rows: r.rows }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao buscar retiradas", detail: e?.message }, { status: 500 })
  } finally {
    client.release()
  }
}