import { NextResponse } from "next/server"
import { Pool, PoolConfig } from "pg"
import bcrypt from "bcryptjs"

function makePgConfig(): PoolConfig {
  if (process.env.PGHOST || process.env.PGUSER || process.env.PGDATABASE) {
    return {
      host: process.env.PGHOST || "127.0.0.1",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE || "fatepack",
      // ssl: { rejectUnauthorized: false }, // use se precisar
    }
  }
  const url = process.env.POSTGRES_URL
  if (!url) throw new Error("Variáveis do PostgreSQL não configuradas")
  return { connectionString: url /*, ssl: { rejectUnauthorized: false }*/ }
}

// Pool singleton
const getPool = () => {
  const g = globalThis as any
  if (!g.__pgPool) g.__pgPool = new Pool(makePgConfig())
  return g.__pgPool as Pool
}

export async function POST(req: Request) {
  // Body
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON)" }, { status: 400 })
  }

  const { name, email, password, phone, block, apartment, tipo } = body || {}
  if (!name || !email || !password || !block || !apartment) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  // Conexão
  const pool = getPool()
  let client
  try {
    client = await pool.connect()
  } catch (e: any) {
    return NextResponse.json(
      { error: "Falha ao conectar no PostgreSQL", detail: e?.message, code: e?.code },
      { status: 500 }
    )
  }

  try {
    await client.query("BEGIN")

    const exists = await client.query("SELECT 1 FROM usuario WHERE email=$1", [email])
    if (exists.rowCount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 })
    }

    // bloco (busca ou cria)
    let id_bloco: number
    {
      const r = await client.query("SELECT id_bloco FROM bloco WHERE nome=$1", [block])
      if (r.rowCount) id_bloco = r.rows[0].id_bloco
      else {
        const ins = await client.query(
          "INSERT INTO bloco (nome) VALUES ($1) RETURNING id_bloco",
          [block]
        )
        id_bloco = ins.rows[0].id_bloco
      }
    }

    // apartamento (busca ou cria)
    let id_apartamento: number
    {
      const r = await client.query(
        "SELECT id_apartamento FROM apartamento WHERE numero=$1 AND id_bloco=$2",
        [apartment, id_bloco]
      )
      if (r.rowCount) id_apartamento = r.rows[0].id_apartamento
      else {
        const ins = await client.query(
          "INSERT INTO apartamento (numero, id_bloco) VALUES ($1,$2) RETURNING id_apartamento",
          [apartment, id_bloco]
        )
        id_apartamento = ins.rows[0].id_apartamento
      }
    }

    const senha_hash = await bcrypt.hash(password, 10)

    const u = await client.query(
      `INSERT INTO usuario (nome, email, senha_hash, telefone, tipo)
       VALUES ($1,$2,$3,$4,$5) RETURNING id_usuario`,
      [name, email, senha_hash, phone || null, tipo || "morador"]
    )
    const id_usuario = u.rows[0].id_usuario

    await client.query(
      "INSERT INTO usuario_apartamento (id_usuario, id_apartamento) VALUES ($1,$2)",
      [id_usuario, id_apartamento]
    )

    await client.query("COMMIT")
    return NextResponse.json({ ok: true, id_usuario }, { status: 201 })
  } catch (e: any) {
    await client.query("ROLLBACK")
    return NextResponse.json(
      { error: "Erro ao cadastrar", detail: e?.message, code: e?.code },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}