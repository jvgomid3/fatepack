import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getPool } from "../../lib/db"

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido (JSON)" }, { status: 400 })
  }

  const { email, password } = body || {}
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 })
  }

  const client = await getPool().connect().catch((e: any) =>
    Promise.reject(NextResponse.json({ error: "Falha ao conectar no PostgreSQL", detail: e?.message }, { status: 500 }))
  ) as any

  try {
    const u = await client.query(
      "SELECT id_usuario, nome, email, senha_hash, tipo FROM usuario WHERE email = $1",
      [email]
    )
    if (!u.rowCount) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }
    const user = u.rows[0]
    const ok = await bcrypt.compare(password, user.senha_hash)
    if (!ok) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })

    const info = await client.query(
      `SELECT b.nome AS block, a.numero AS apartment
       FROM usuario_apartamento ua
       JOIN apartamento a ON a.id_apartamento = ua.id_apartamento
       JOIN bloco b ON b.id_bloco = a.id_bloco
       WHERE ua.id_usuario = $1
       ORDER BY ua.id_apartamento ASC
       LIMIT 1`,
      [user.id_usuario]
    )

    return NextResponse.json({
      id: user.id_usuario,
      name: user.nome,
      email: user.email,
      tipo: user.tipo || "morador",
      block: info.rows?.[0]?.block || null,
      apartment: info.rows?.[0]?.apartment || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: "Erro no login", detail: e?.message }, { status: 500 })
  } finally {
    client.release()
  }
}