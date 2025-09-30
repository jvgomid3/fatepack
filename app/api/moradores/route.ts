import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const bloco = String(url.searchParams.get("bloco") || url.searchParams.get("block") || "").trim()
  const apto = String(url.searchParams.get("apto") || url.searchParams.get("apartamento") || url.searchParams.get("apartment") || "").trim()

  if (!bloco || !apto) {
    return NextResponse.json({ error: "Parâmetros 'bloco' e 'apto' são obrigatórios" }, { status: 400 })
  }

  try {
    // Consulta direta no Supabase
    const { data, error } = await supabase
      .from("usuario")
      .select("nome, telefone, bloco, apto")
      .eq("bloco", bloco)
      .eq("apto", apto)
      .order("nome", { ascending: true })

    if (error) {
      console.error("/api/moradores supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
    }

    const moradores = (data || []).map((r: any) => ({
      nome: r.nome,
      telefone: r.telefone,
    }))
    return NextResponse.json({ ok: true, moradores })
  } catch (e: any) {
    console.error("/api/moradores error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}
