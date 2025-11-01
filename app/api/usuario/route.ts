import { NextResponse } from "next/server"
import { getSupabaseClient } from "../../../lib/supabaseClient"
import { getUserFromRequest } from "../../../lib/server/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase()
  const nome = String(url.searchParams.get("nome") || "").trim()
  const checkOnly = url.searchParams.get("checkOnly") === "true"
  
  if (!email && !nome) return NextResponse.json({ error: "Informe email ou nome" }, { status: 400 })
  
  const user = getUserFromRequest(req)
  
  // Allow unauthenticated "checkOnly" requests for email existence check (registration flow)
  // but return ONLY existence status without exposing any user data
  if (!user) {
    if (checkOnly && email) {
      // Public endpoint: only check if email exists (no sensitive data returned)
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("usuario")
          .select("email")
          .eq("email", email)
          .maybeSingle()
        
        if (error) {
          console.error("/api/usuario checkOnly error:", error.message)
          return NextResponse.json({ error: "DB_ERROR" }, { status: 500 })
        }
        
        return NextResponse.json({ exists: !!data }, { status: 200 })
      } catch (e: any) {
        console.error("/api/usuario checkOnly exception:", e?.message || e)
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
      }
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = String(user?.tipo || "").toLowerCase()
  const isPrivileged = ["admin", "porteiro", "síndico", "sindico"].includes(role)
  if (email) {
    // allow if privileged or requesting their own record
    if (!isPrivileged && String(user?.email || "").toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } else {
    // nome-based searches are admin-only
    if (!isPrivileged) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseClient()
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