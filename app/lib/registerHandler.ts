import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPool } from "./db"

export async function registerHandler(req: Request) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Body inválido (JSON)" }, { status: 400 })
  }

  const { name, email, password, phone, block, apartment, tipo } = body || {}
  if (!name || !email || !password || !block || !apartment) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

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

  let stage = "BEGIN"
  try {
    await client.query("BEGIN")

    stage = "CHECK_DUP_EMAIL"
    const dup = await client.query("SELECT 1 FROM usuario WHERE email=$1", [email])
    if (dup.rowCount) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 })
    }

    // Tipo de apartamento.numero
    stage = "APTO_COLUMN_TYPE"
    const numInfo = await client.query(
      `SELECT data_type
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='apartamento' AND column_name='numero'`
    )
    const numeroType = (numInfo.rows?.[0]?.data_type || "").toLowerCase()
    const numeroIsNumeric = ["integer","bigint","smallint","numeric","decimal","real","double precision"].includes(numeroType)
    const apartmentNormalized = numeroIsNumeric
      ? Number(String(apartment).replace(/\D/g, "") || "0")
      : String(apartment).trim()

    // Bloco
    stage = "GET_BLOCO"
    let id_bloco: number
    const rb = await client.query("SELECT id_bloco FROM bloco WHERE nome=$1", [block])
    if (rb.rowCount) id_bloco = rb.rows[0].id_bloco
    else {
      stage = "CREATE_BLOCO"
      const ib = await client.query("INSERT INTO bloco (nome) VALUES ($1) RETURNING id_bloco", [block])
      id_bloco = ib.rows[0].id_bloco
    }

    // Apartamento
    stage = "GET_APARTAMENTO"
    let id_apartamento: number
    const ra = await client.query(
      "SELECT id_apartamento FROM apartamento WHERE numero=$1 AND id_bloco=$2",
      [apartmentNormalized, id_bloco]
    )
    if (ra.rowCount) id_apartamento = ra.rows[0].id_apartamento
    else {
      stage = "CREATE_APARTAMENTO"
      const ia = await client.query(
        "INSERT INTO apartamento (numero, id_bloco) VALUES ($1,$2) RETURNING id_apartamento",
        [apartmentNormalized, id_bloco]
      )
      id_apartamento = ia.rows[0].id_apartamento
    }

    // Usuario
    stage = "HASH_PASSWORD"
    const senha_hash = await bcrypt.hash(password, 10)

    // aceita block/apartment e bloco/apto do payload, limitando ao tamanho das colunas
    const blocoStr = String(body.bloco ?? body.block ?? "").trim().slice(0, 10)
    const aptoStr  = String(body.apto  ?? body.apartment ?? "").trim().slice(0, 20)
    const phoneDigits = String(phone ?? "").replace(/\D/g, "")
    const phoneValue = phoneDigits.length ? phoneDigits : null

    // LOG para conferência no terminal
    console.log("REGISTER INSERT_USUARIO valores:", {
      blocoStr,
      aptoStr,
      phoneValue,
      email,
      nome: name,
      tipo: tipo || "morador",
    })

    stage = "INSERT_USUARIO"
    const u = await client.query(
      `INSERT INTO usuario (nome, email, senha_hash, telefone, tipo, bloco, apto)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id_usuario`,
      [name, email, senha_hash, phoneValue, (tipo || "morador"), blocoStr, aptoStr]
    )
    const id_usuario = u.rows[0].id_usuario

    stage = "LINK_USUARIO_APARTAMENTO"
    await client.query(
      "INSERT INTO usuario_apartamento (id_usuario, id_apartamento) VALUES ($1,$2)",
      [id_usuario, id_apartamento]
    )

    stage = "COMMIT"
    await client.query("COMMIT")
    return NextResponse.json({ ok: true, id_usuario }, { status: 201 })
  } catch (e: any) {
    console.error("REGISTER ERROR @", stage, e)
    await client.query("ROLLBACK")
    return NextResponse.json(
      { error: "Erro ao cadastrar", stage, detail: e?.message, code: e?.code },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}