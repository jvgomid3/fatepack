import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabaseClient"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

type UsuarioRow = {
  nome: string
  email: string
  telefone?: string | null
  tipo?: string | null
  bloco?: string | null
  apto?: string | null
  senha_hash?: string | null
}

function sanitizeStr(v: any): string | undefined {
  const s = String(v ?? "").trim()
  return s ? s : undefined
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const nome = sanitizeStr(url.searchParams.get("nome"))
    const email = sanitizeStr(url.searchParams.get("email"))
    const bloco = sanitizeStr(url.searchParams.get("bloco"))
    const apartamento = sanitizeStr(url.searchParams.get("apartamento"))

    let query = supabase
      .from("usuario")
      .select("nome, email, telefone, tipo, bloco, apto")
      .order("nome", { ascending: true })

    if (email) query = query.ilike("email", `%${email}%`)
    if (nome) query = query.ilike("nome", `%${nome}%`)
    if (bloco) query = query.eq("bloco", bloco)
    if (apartamento) query = query.eq("apto", apartamento)

    const { data, error } = await query
    if (error) {
      console.error("/api/moradores GET supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
    }

    const items = (data ?? []).map((d: any) => ({
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      tipo: d.tipo,
      bloco: d.bloco,
      apartamento: d.apto,
    }))
    return NextResponse.json({ ok: true, items })
  } catch (e: any) {
    console.error("/api/moradores GET error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    // Default password for new users: "1234"
    const defaultPassword = "1234"
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(defaultPassword, salt)

    const payload: UsuarioRow = {
      nome: String(body?.nome || "").trim(),
      email: String(body?.email || "").trim().toLowerCase(),
      telefone: sanitizeStr(body?.telefone) || null,
      tipo: sanitizeStr(body?.tipo) || "morador",
      bloco: sanitizeStr(body?.bloco) || null,
      apto: sanitizeStr(body?.apartamento ?? body?.apto) || null,
      senha_hash: hashed,
    }

    if (!payload.nome || !payload.email) {
      return NextResponse.json({ error: "NOME_EMAIL_OBRIGATORIOS" }, { status: 400 })
    }

    // Use admin client if available to bypass any RLS or permissions issues
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const client = adminKey && supaUrl
      ? createClient(supaUrl, adminKey, { auth: { persistSession: false } })
      : supabase

    const { data, error } = await client
      .from("usuario")
      .insert(payload)
      .select("nome, email, telefone, tipo, bloco, apto")
      .single()

    if (error) {
      console.error("/api/moradores POST supabase error:", error.message, error)
      // Mapeia violação de UNIQUE de forma precisa (só marca como email se a constraint for de email)
      const msg = (error.message || "").toLowerCase()
      const detail = (error.details || error.hint || "").toLowerCase()
      const isUniqueViolation = error.code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint")
      const mentionsEmail = msg.includes("email") || detail.includes("(email)") || msg.includes("usuario_email")
      if (isUniqueViolation) {
        if (mentionsEmail) {
          return NextResponse.json({ error: "EMAIL_JA_CADASTRADO" }, { status: 409 })
        }
        // Outra constraint UNIQUE — retorne detalhe para UI mostrar a causa real
        return NextResponse.json({ error: "DB_UNIQUE_VIOLATION", detail: error.message || error.details || "" }, { status: 409 })
      }
      return NextResponse.json({ error: "DB_ERROR", detail: error.message || error.hint || "" }, { status: 500 })
    }
    const item = data
      ? {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo,
          bloco: data.bloco,
          apartamento: data.apto,
        }
      : null
    return NextResponse.json({ ok: true, item })
  } catch (e: any) {
    console.error("/api/moradores POST error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const originalEmail = String(body?.originalEmail || body?.oldEmail || "").trim().toLowerCase()
    const newEmail = String(body?.email || "").trim().toLowerCase()
    if (!originalEmail && !newEmail) return NextResponse.json({ error: "EMAIL_OBRIGATORIO" }, { status: 400 })
    const identifierEmail = originalEmail || newEmail

    const toUpdate: Partial<UsuarioRow> = {}
    if (body?.nome !== undefined) toUpdate.nome = String(body?.nome || "").trim()
    if (body?.telefone !== undefined) toUpdate.telefone = sanitizeStr(body?.telefone) || null
    if (body?.tipo !== undefined) toUpdate.tipo = sanitizeStr(body?.tipo) || null
    if (body?.bloco !== undefined) toUpdate.bloco = sanitizeStr(body?.bloco) || null
    if (body?.apartamento !== undefined || body?.apto !== undefined) toUpdate.apto = sanitizeStr(body?.apartamento ?? body?.apto) || null
    // allow updating the email address itself
    if (body?.email !== undefined && newEmail && newEmail !== identifierEmail) {
      toUpdate.email = newEmail
    }

    const { data, error, status } = await supabase
      .from("usuario")
      .update(toUpdate)
      .eq("email", identifierEmail)
      .select("nome, email, telefone, tipo, bloco, apto")
      .maybeSingle()

    if (error) {
      console.error("/api/moradores PUT supabase error:", error.message, error)
      const msg = (error.message || "").toLowerCase()
      const detail = (error.details || error.hint || "").toLowerCase()
      const isUniqueViolation = error.code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("duplicate") || msg.includes("unique")
      const mentionsEmail = msg.includes("email") || detail.includes("(email)") || msg.includes("usuario_email")
      if (isUniqueViolation) {
        if (mentionsEmail) {
          return NextResponse.json({ error: "EMAIL_JA_CADASTRADO" }, { status: 409 })
        }
        return NextResponse.json({ error: "DB_UNIQUE_VIOLATION", detail: error.message || error.details || "" }, { status: 409 })
      }
      return NextResponse.json({ error: "DB_ERROR", detail: error.message || error.hint || "" }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: "USUARIO_NAO_ENCONTRADO" }, { status: 404 })

    const item = data
      ? {
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo,
          bloco: data.bloco,
          apartamento: data.apto,
        }
      : null
    return NextResponse.json({ ok: true, item, status })
  } catch (e: any) {
    console.error("/api/moradores PUT error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const email = sanitizeStr(url.searchParams.get("email")) || undefined
    if (!email) return NextResponse.json({ error: "EMAIL_OBRIGATORIO" }, { status: 400 })

    // Use admin client if available to bypass RLS; otherwise fall back to anon client
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const client = adminKey && supaUrl
      ? createClient(supaUrl, adminKey, { auth: { persistSession: false } })
      : supabase

    const { data, error, status } = await client
      .from("usuario")
      .delete()
      .eq("email", email)
      .select("email")

    if (error) {
      console.error("/api/moradores DELETE supabase error:", error.message)
      return NextResponse.json({ error: "DB_ERROR", detail: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) {
      // Try case-insensitive match if exact match didn't find anything
      const res2 = await client
        .from("usuario")
        .delete()
        .ilike("email", email)
        .select("email")
      if (res2.error) {
        console.error("/api/moradores DELETE supabase ilike error:", res2.error.message)
        return NextResponse.json({ error: "DB_ERROR", detail: res2.error.message }, { status: 500 })
      }
      if (!res2.data || res2.data.length === 0) {
        return NextResponse.json({ error: "USUARIO_NAO_ENCONTRADO" }, { status: 404 })
      }
      return NextResponse.json({ ok: true, status: res2.status })
    }

    return NextResponse.json({ ok: true, status })
  } catch (e: any) {
    console.error("/api/moradores DELETE error:", e?.message || e)
    return NextResponse.json({ error: "SERVER_ERROR", detail: e?.message || String(e) }, { status: 500 })
  }
}
