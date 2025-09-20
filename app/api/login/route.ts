export const runtime = "nodejs"

import "server-only"
import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifier = String(body.username ?? body.email ?? body.nome ?? "").trim()
    const providedRaw = body.password ?? body.senha ?? ""
    const provided = String(providedRaw).trim()

    console.log("[/api/login] payload:", { identifier, passwordExists: !!provided })

    if (!identifier || !provided) {
      return NextResponse.json({ error: "Missing username or password" }, { status: 400 })
    }

    // tenta por email primeiro
    let result = await supabase
      .from("usuario")
      .select("*")
      .eq("email", identifier)
      .limit(1)
      .single()

    // se não encontrou por email, tenta por nome
    if (!result.data) {
      result = await supabase
        .from("usuario")
        .select("*")
        .eq("nome", identifier)
        .limit(1)
        .single()
    }

    const { data, error } = result
    console.log("[/api/login] supabase result:", { error: error ? error.message : null, found: !!data, sample: data ? { id: data.id ?? data.id_usuario, email: data.email, nome: data.nome, senha: data.senha ?? data.senha_hash ?? null } : null })

    if (error || !data) {
      return NextResponse.json({ error: "Credenciais inválidas", detail: error?.message ?? "no row" }, { status: 401 })
    }

    // aceitar vários nomes de campo de senha e normalizar
    const storedRaw = data.senha ?? data.senha_hash ?? data.password ?? data.pass ?? null
    if (storedRaw === null || storedRaw === false || typeof storedRaw === "undefined") {
      return NextResponse.json({ error: "Credenciais inválidas", detail: "no_password_set" }, { status: 401 })
    }

    const stored = String(storedRaw).trim()
    console.log("[/api/login] compare", { stored, provided }) // debug

    if (stored !== provided) {
      return NextResponse.json({ error: "Credenciais inválidas", detail: "password_mismatch" }, { status: 401 })
    }

    const safe = { ...data }
    delete (safe as any).senha
    delete (safe as any).senha_hash
    delete (safe as any).password
    delete (safe as any).pass

    const token = Buffer.from(`${safe.id ?? safe.id_usuario ?? identifier}:${Date.now()}`).toString("base64")

    return NextResponse.json({
      ok: true,
      token,
      user: safe,
      redirect: String(safe.tipo ?? "") === "admin" ? "/historico" : "/inicio",
    })
  } catch (e: any) {
    console.error("POST /api/login error:", e?.message ?? e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: String(e?.message ?? e) }, { status: 500 })
  }
}