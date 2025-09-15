export const runtime = "nodejs"

import { NextResponse } from "next/server"
import pkg from "pg"
import { getUserFromRequest } from "../../../lib/server/auth"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
})

const TABLE = "encomenda"

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = await pool.connect()
  try {
    const isAdmin = String(user.tipo || "").toLowerCase() === "admin"

    const baseSql = `
      SELECT
        e.id_encomenda                       AS id,
        e.empresa_entrega,
        e.data_recebimento,
        e.id_apartamento,
        e.bloco,
        e.apartamento,
        e.nome,
        e.recebido_por,
        r.nome_retirou                       AS retirado_por,
        r.data_retirada                      AS data_retirada
      FROM encomenda e
      LEFT JOIN LATERAL (
        SELECT rr.nome_retirou, rr.data_retirada
        FROM retirada rr
        WHERE rr.id_encomenda = e.id_encomenda
        ORDER BY rr.data_retirada DESC NULLS LAST, rr.id_retirada DESC
        LIMIT 1
      ) r ON TRUE
    `

    if (isAdmin) {
      const r = await client.query(
        `${baseSql}
         ORDER BY e.data_recebimento DESC NULLS LAST, e.id_encomenda DESC`
      )
      return NextResponse.json(r.rows)
    }

    const bloco = String(user.bloco ?? "").trim().padStart(2, "0")
    const apto  = String(user.apto  ?? user.apartamento ?? "").trim().padStart(2, "0")

    const r = await client.query(
      `${baseSql}
       WHERE e.bloco = $1 AND e.apartamento = $2
       ORDER BY e.data_recebimento DESC NULLS LAST, e.id_encomenda DESC`,
      [bloco, apto]
    )
    return NextResponse.json(r.rows)
  } catch (e: any) {
    console.error("GET /api/encomendas:", e?.message, e?.code, e?.detail)
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 })
  } finally {
    client.release()
  }
}

async function findIdApartamento(client: pkg.PoolClient, bloco: string, apt: string) {
  const r = await client.query(
    `SELECT a.id_apartamento
       FROM apartamento a
       JOIN bloco b ON b.id_bloco = a.id_bloco
      WHERE b.nome = $1 AND a.numero = $2
      LIMIT 1`,
    [bloco, apt]
  )
  return r.rows[0]?.id_apartamento ?? null
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  const role = String(user?.tipo || "").toLowerCase()
  const dev = process.env.NODE_ENV !== "production"

  if (!user || !["admin", "porteiro", "síndico", "sindico"].includes(role)) {
    return NextResponse.json(
      { error: "Unauthorized", reason: !user ? "NO_TOKEN_OR_INVALID" : "ROLE_NOT_ALLOWED", role: dev ? role : undefined },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const empresa = String(body.empresa_entrega ?? body.empresa ?? "").trim()
  const bloco = String(body.bloco ?? "").trim().padStart(2, "0")
  const apartamento = String(body.apartamento ?? body.apto ?? "").trim().padStart(2, "0")
  const nome = String(body.nome ?? "").trim()
  const recebidoPor = String(body.recebido_por ?? user.nome ?? "").trim()

  if (!empresa || !bloco || !apartamento || !nome) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    const idApto = await findIdApartamento(client, bloco, apartamento)
    if (!idApto) {
      return NextResponse.json(
        { error: "APARTAMENTO_NOT_FOUND", bloco, apartamento },
        { status: 400 }
      )
    }

    const r = await client.query(
      `INSERT INTO encomenda
         (empresa_entrega, data_recebimento, id_apartamento, bloco, apartamento, nome, recebido_por)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)
       RETURNING id_encomenda AS id`,
      [empresa, idApto, bloco, apartamento, nome, recebidoPor]
    )
    return NextResponse.json({ ok: true, id: r.rows[0].id })
  } catch (e: any) {
    console.error("POST /api/encomendas:", { message: e?.message, code: e?.code, detail: e?.detail })
    return NextResponse.json(
      { error: "DB_ERROR", message: e?.message, code: e?.code, detail: e?.detail },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}