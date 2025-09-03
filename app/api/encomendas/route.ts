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

// Pool singleton
let _pool: Pool | null = null
const getPool = () => (_pool ??= new Pool(makePgConfig()))

// helper: capitaliza primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const empresa = searchParams.get("empresa") || ""
  const mes = searchParams.get("mes") || ""              // formato YYYY-MM
  const bloco = searchParams.get("bloco") || ""
  const apartamento = searchParams.get("apartamento") || ""

  const client = await getPool().connect()
  try {
    await client.query(`SET TIME ZONE 'America/Sao_Paulo'`)

    const where: string[] = []
    const params: any[] = []
    let i = 1
    if (empresa)      { where.push(`e.empresa_entrega = $${i++}`); params.push(empresa) }
    if (bloco)        { where.push(`e.bloco = $${i++}`);           params.push(bloco) }
    if (apartamento)  { where.push(`e.apartamento = $${i++}`);     params.push(apartamento) }
    if (mes) {
      where.push(`date_trunc('month', e.data_recebimento) = to_date($${i++}, 'YYYY-MM')`)
      params.push(mes)
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const sql = `
      SELECT 
        e.id_encomenda,
        e.empresa_entrega,
        e.data_recebimento,
        to_char(e.data_recebimento, 'DD/MM/YYYY HH24:MI') AS data_recebimento_fmt,
        e.id_apartamento,
        e.bloco,
        e.apartamento,
        e.nome,
        e.recebido_por,
        r.nome_retirou,
        r.data_retirada,
        to_char(r.data_retirada, 'DD/MM/YYYY HH24:MI') AS data_retirada_fmt,
        (now()::timestamp - e.data_recebimento <= interval '24 hours') AS is_new
      FROM encomenda e
      LEFT JOIN LATERAL (
        SELECT nome_retirou, data_retirada
          FROM retirada
         WHERE id_encomenda = e.id_encomenda
         ORDER BY data_retirada DESC, id_retirada DESC
         LIMIT 1
      ) r ON true
      ${whereSql}
      ORDER BY e.data_recebimento DESC
    `
    const r = await client.query(sql, params)

    // meses disponíveis (sempre do conjunto total)
    const m = await client.query(
      `SELECT to_char(date_trunc('month', data_recebimento), 'YYYY-MM') AS ym
         FROM encomenda
        GROUP BY 1
        ORDER BY 1 DESC`
    )

    return NextResponse.json({ ok: true, rows: r.rows, months: m.rows.map((x) => x.ym) }, { status: 200 })
  } finally {
    client.release()
  }
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON)" }, { status: 400 })
  }

  const empresaBruta = String(body.empresa ?? body.empresa_entrega ?? "").trim()
  const blocoBruto = String(body.bloco ?? body.block ?? "").trim()
  const aptoBruto = String(body.apartamento ?? body.apartment ?? "").trim()
  const nomeBruto = String(body.nome ?? body.morador ?? "").trim()
  const recebidoPorBruto = String(body.recebidoPor ?? body.recebido_por ?? "").trim()

  if (!empresaBruta || !blocoBruto || !aptoBruto || !nomeBruto || !recebidoPorBruto) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  const empresa = capFirst(empresaBruta).slice(0, 100)
  const bloco = blocoBruto.slice(0, 10)
  const apartamento = aptoBruto.slice(0, 20)
  const nome = capFirst(nomeBruto).slice(0, 120)
  const recebido_por = capFirst(recebidoPorBruto).slice(0, 120)

  const pool = getPool()
  const client = await pool.connect()
  let stage = "BEGIN"
  try {
    await client.query("BEGIN")
    await client.query(`SET TIME ZONE 'America/Sao_Paulo'`) // grava local SP na coluna sem TZ

    // Detecta tipo de apartamento.numero para normalizar corretamente
    stage = "APTO_COLUMN_TYPE"
    const numInfo = await client.query(
      `SELECT data_type
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='apartamento' AND column_name='numero'`
    )
    const dataType = (numInfo.rows?.[0]?.data_type || "").toLowerCase()
    const isNumeric = ["integer", "bigint", "smallint", "numeric", "decimal", "real", "double precision"].includes(
      dataType
    )
    const numeroNorm = isNumeric ? Number(apartamento.replace(/\D/g, "") || "0") : apartamento

    // Bloco: tenta achar por "01" ou "Bloco 01"; cria se não existir
    stage = "GET_BLOCO"
    const nomePossivel1 = bloco
    const nomePossivel2 = bloco.startsWith("Bloco") ? bloco : `Bloco ${bloco}`
    let id_bloco: number | null = null
    {
      const rb = await client.query(
        "SELECT id_bloco FROM bloco WHERE nome = $1 OR nome = $2 LIMIT 1",
        [nomePossivel1, nomePossivel2]
      )
      if (rb.rowCount) {
        id_bloco = rb.rows[0].id_bloco
      } else {
        const ib = await client.query("INSERT INTO bloco (nome) VALUES ($1) RETURNING id_bloco", [nomePossivel2])
        id_bloco = ib.rows[0].id_bloco
      }
    }

    // Apartamento: procura por numero + id_bloco; cria se não existir
    stage = "GET_APARTAMENTO"
    let id_apartamento: number
    {
      const ra = await client.query(
        "SELECT id_apartamento FROM apartamento WHERE numero = $1 AND id_bloco = $2",
        [numeroNorm, id_bloco]
      )
      if (ra.rowCount) {
        id_apartamento = ra.rows[0].id_apartamento
      } else {
        const ia = await client.query(
          "INSERT INTO apartamento (numero, id_bloco) VALUES ($1,$2) RETURNING id_apartamento",
          [numeroNorm, id_bloco]
        )
        id_apartamento = ia.rows[0].id_apartamento
      }
    }

    // Encomenda
    stage = "INSERT_ENCOMENDA"
    const r = await client.query(
      `INSERT INTO encomenda 
         (empresa_entrega, data_recebimento, id_apartamento, bloco, apartamento, nome, recebido_por)
       VALUES ($1, now(), $2, $3, $4, $5, $6)
       RETURNING 
         id_encomenda, 
         recebido_por, 
         data_recebimento,
         to_char(data_recebimento, 'DD/MM/YYYY HH24:MI') AS data_recebimento_fmt`,
      [empresa, id_apartamento, bloco, apartamento, nome, recebido_por]
    )

    const row = r.rows[0]
    await client.query("COMMIT")
    return NextResponse.json(
      { ok: true, id_encomenda: row.id_encomenda, recebido_por: row.recebido_por, data_recebimento: row.data_recebimento, data_recebimento_fmt: row.data_recebimento_fmt },
      { status: 201 }
    )
  } catch (e: any) {
    await client.query("ROLLBACK")
    return NextResponse.json(
      { error: "Falha ao registrar encomenda", stage, detail: e?.message, code: e?.code },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}