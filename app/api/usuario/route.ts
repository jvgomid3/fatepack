import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase()
  const nome = String(url.searchParams.get("nome") || "").trim()
  if (!email && !nome) return NextResponse.json({ error: "Informe email ou nome" }, { status: 400 })

  try {
    if (email) {
      const { data, error, status } = await supabase
        .from("usuario")
        .select("nome, email, telefone, tipo, bloco, apto")
        .eq("email", email)
        .maybeSingle()

      if (error) {
        console.error("/api/usuario supabase error (email):", error.message)
        return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
      }
      if (!data) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

      return NextResponse.json({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        tipo: data.tipo,
        bloco: data.bloco,
        apartamento: data.apto,
      })
    }

    // Busca por nome (case-insensitive). Primeiro tenta match exato (ilike), depois um contains.
    const { data: exact, error: e1 } = await supabase
      .from("usuario")
      .select("nome, email, telefone, tipo, bloco, apto")
      .ilike("nome", nome)
      .limit(1)
    if (e1) {
      console.error("/api/usuario supabase error (nome exact):", e1.message)
      return NextResponse.json({ error: "DB_ERROR", detail: e1.message }, { status: 500 })
    }
    let found = exact?.[0]
    if (!found && nome) {
      const { data: partial, error: e2 } = await supabase
        .from("usuario")
        .select("nome, email, telefone, tipo, bloco, apto")
        .ilike("nome", `%${nome}%`)
        .limit(1)
      if (e2) {
        console.error("/api/usuario supabase error (nome contains):", e2.message)
        return NextResponse.json({ error: "DB_ERROR", detail: e2.message }, { status: 500 })
      }
      found = partial?.[0]
    }

    if (!found) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

    return NextResponse.json({
      nome: found.nome,
      email: found.email,
      telefone: found.telefone,
      tipo: found.tipo,
      bloco: found.bloco,
      apartamento: found.apto,
    })
  } catch (e: any) {
    console.error("/api/usuario error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}