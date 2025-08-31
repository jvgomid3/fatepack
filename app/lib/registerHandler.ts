import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPool } from "./db"

export async function registerHandler(req: Request) {
  // body
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Body inválido (JSON)" }, { status: 400 })
  }

  const { name, email, password, phone, block, apartment, tipo } = body || {}
  if (!name || !email || !password || !block || !apartment) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  // conexão
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

    // e-mail único
    const dup = await client.query("SELECT 1 FROM usuario WHERE email=$1", [email])
    if (dup.rowCount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 })
    }

    // bloco (busca ou cria)
    let id_bloco: number
    const rb = await client.query("SELECT id_bloco FROM bloco WHERE nome=$1", [block])
    if (rb.rowCount) id_bloco = rb.rows[0].id_bloco
    else {
      const ib = await client.query(
        "INSERT INTO bloco (nome) VALUES ($1) RETURNING id_bloco",
        [block]
      )
      id_bloco = ib.rows[0].id_bloco
    }

    // apartamento (busca ou cria)
    let id_apartamento: number
    const ra = await client.query(
      "SELECT id_apartamento FROM apartamento WHERE numero=$1 AND id_bloco=$2",
      [apartment, id_bloco]
    )
    if (ra.rowCount) id_apartamento = ra.rows[0].id_apartamento
    else {
      const ia = await client.query(
        "INSERT INTO apartamento (numero, id_bloco) VALUES ($1,$2) RETURNING id_apartamento",
        [apartment, id_bloco]
      )
      id_apartamento = ia.rows[0].id_apartamento
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