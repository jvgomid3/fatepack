export const runtime = "nodejs"

import "server-only"
import { NextResponse } from "next/server"
import { getSupabaseClient } from "../../../lib/supabaseClient"
import bcrypt from "bcryptjs"
import { signToken } from "../../../lib/server/auth"

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
    const supabase = getSupabaseClient()
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
    const stored = String(storedRaw)
    let match = false
    // Se for hash bcrypt (começa com $2a/$2b/$2y), comparar via bcrypt
    if (/^\$2[aby]\$/.test(stored)) {
      match = await bcrypt.compare(provided, stored)
    } else {
      // compatibilidade com senhas legadas em texto puro
      match = stored.trim() === provided
    }
    console.log("[/api/login] compare", { usedBcrypt: /^\$2[aby]\$/.test(stored), match })
    if (!match) {
      return NextResponse.json({ error: "Credenciais inválidas", detail: "password_mismatch" }, { status: 401 })
    }

    const safe = { ...data }
    delete (safe as any).senha
    delete (safe as any).senha_hash
    delete (safe as any).password
    delete (safe as any).pass

    // Gera JWT compatível com os endpoints protegidos (usa claims esperadas)
    const payload = {
      id: Number(safe.id ?? safe.id_usuario ?? 0),
      nome: String(safe.nome ?? identifier),
      email: String(safe.email ?? ""),
      tipo: String(safe.tipo ?? ""),
      bloco: String((safe as any).bloco ?? (safe as any).userBlock ?? ""),
      apto: String((safe as any).apartamento ?? (safe as any).userApartment ?? (safe as any).apto ?? ""),
      apartamento: String((safe as any).apartamento ?? (safe as any).userApartment ?? ""),
    }
    const token = signToken(payload, "8h")

    return NextResponse.json({
      ok: true,
      token,
      user: safe,
      redirect: String(safe.tipo ?? "") === "admin" ? "/inicio-admin" : "/inicio",
    })
  } catch (e: any) {
    console.error("POST /api/login error:", e?.message ?? e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: String(e?.message ?? e) }, { status: 500 })
  }
}