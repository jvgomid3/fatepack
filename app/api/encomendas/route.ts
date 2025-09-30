export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/server/auth"
import { supabaseAdmin } from "../../../lib/server/supabaseAdmin"

const TABLE = "encomenda"

export async function GET(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const isAdmin = String(user.tipo || "").toLowerCase() === "admin"
    const baseSelect = `id_encomenda, empresa_entrega, data_recebimento, id_apartamento, bloco, apartamento, nome, recebido_por,
      retirada:retirada!retirada_id_encomenda_fkey(id_retirada, nome_retirou, data_retirada)`

    if (isAdmin) {
      const { data, error } = await supabaseAdmin
        .from(TABLE)
        .select(baseSelect)
        .order("data_recebimento", { ascending: false, nullsFirst: false })
        .order("id_encomenda", { ascending: false })
      if (error) throw error
      // flatten latest retirada by sorting client-side (Supabase returns arrays for one-to-many by default if configured)
      return NextResponse.json(
        (data || []).map((e: any) => ({
          id: e.id_encomenda,
          empresa_entrega: e.empresa_entrega,
          data_recebimento: e.data_recebimento,
          id_apartamento: e.id_apartamento,
          bloco: e.bloco,
          apartamento: e.apartamento,
          nome: e.nome,
          recebido_por: e.recebido_por,
          retirado_por: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].nome_retirou : null,
          data_retirada: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].data_retirada : null,
        }))
      )
    }

    const bloco = String(user.bloco ?? "").trim().padStart(2, "0")
    const apto  = String(user.apto  ?? user.apartamento ?? "").trim().padStart(2, "0")
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(baseSelect)
      .eq("bloco", bloco)
      .eq("apartamento", apto)
      .order("data_recebimento", { ascending: false, nullsFirst: false })
      .order("id_encomenda", { ascending: false })
    if (error) throw error
    return NextResponse.json(
      (data || []).map((e: any) => ({
        id: e.id_encomenda,
        empresa_entrega: e.empresa_entrega,
        data_recebimento: e.data_recebimento,
        id_apartamento: e.id_apartamento,
        bloco: e.bloco,
        apartamento: e.apartamento,
        nome: e.nome,
        recebido_por: e.recebido_por,
        retirado_por: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].nome_retirou : null,
        data_retirada: Array.isArray(e.retirada) && e.retirada.length ? e.retirada[0].data_retirada : null,
      }))
    )
  } catch (e: any) {
    console.error("GET /api/encomendas:", e?.message)
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 })
  }
}

async function findIdApartamento(bloco: string, apt: string) {
  // tenta encontrar via bloco.nome e apartamento.numero
  const { data: b, error: eb } = await supabaseAdmin
    .from("bloco")
    .select("id_bloco, nome")
    .or(`nome.eq.${bloco},nome.eq.${String(Number(bloco))}`)
    .limit(1)
    .maybeSingle()
  if (eb) throw eb
  if (!b) return null

  const { data: a, error: ea } = await supabaseAdmin
    .from("apartamento")
    .select("id_apartamento, numero, id_bloco")
    .eq("id_bloco", b.id_bloco)
    .or(`numero.eq.${apt},numero.eq.${String(Number(apt))}`)
    .limit(1)
    .maybeSingle()
  if (ea) throw ea
  return a?.id_apartamento ?? null
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  const role = String(user?.tipo || "").toLowerCase()
  const dev = process.env.NODE_ENV !== "production"

  if (!user || !["admin", "porteiro", "síndico", "sindico"].includes(role)) {
    return NextResponse.json(
      { error: "Unauthorized", reason: !user ? "NO_TOKEN_OR_INVALID" : "ROLE_NOT_ALLOWED", role: dev ? role : undefined },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const empresa = String(body.empresa_entrega ?? body.empresa ?? "").trim()
  const bloco = String(body.bloco ?? "").trim().padStart(2, "0")
  const apartamento = String(body.apartamento ?? body.apto ?? "").trim().padStart(2, "0")
  const nomeInput = String(body.nome ?? "").trim()
  const recebidoPor = String(body.recebido_por ?? user.nome ?? "").trim()

  if (!empresa || !bloco || !apartamento) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  try {
    let idApto = await findIdApartamento(bloco, apartamento)
    // Fallback: tenta resolver via usuario_apartamento (caso bloco/apartamento estejam inconsistentes)
    if (!idApto) {
      const { data: ulist, error: eul } = await supabaseAdmin
        .from("usuario")
        .select("id_usuario")
        .in("bloco", [bloco, String(Number(bloco))])
        .in("apto", [apartamento, String(Number(apartamento))])
        .limit(1)
      if (eul) throw eul
      const uId = ulist && ulist.length ? ulist[0].id_usuario : null
      if (uId) {
        const { data: ua, error: eua } = await supabaseAdmin
          .from("usuario_apartamento")
          .select("id_apartamento")
          .eq("id_usuario", uId)
          .limit(1)
        if (eua) throw eua
        idApto = ua && ua.length ? ua[0].id_apartamento : null
      }
    }
    if (!idApto) {
      return NextResponse.json(
        { error: "APARTAMENTO_NOT_FOUND", bloco, apartamento },
        { status: 400 }
      )
    }

    // Resolve destinatário via usuario_apartamento
    const { data: uaRows, error: erUa } = await supabaseAdmin
      .from("usuario_apartamento")
      .select("id_usuario")
      .eq("id_apartamento", idApto)
    if (erUa) throw erUa
    const residentIds = (uaRows || []).map((r: any) => r.id_usuario)
    if (!residentIds.length) {
      return NextResponse.json(
        { error: "NO_USER_FOR_APARTMENT", bloco, apartamento },
        { status: 400 }
      )
    }

    const { data: users, error: erUsers } = await supabaseAdmin
      .from("usuario")
      .select("id_usuario, nome")
      .in("id_usuario", residentIds)
    if (erUsers) throw erUsers

    let destinatario = ""
    if ((users || []).length === 1) {
      destinatario = String(users![0].nome || "")
    } else {
      if (nomeInput) {
        const match = (users || []).find((r: any) => String(r?.nome || "").toLowerCase() === nomeInput.toLowerCase())
        if (match) destinatario = String(match.nome)
      }
      if (!destinatario) {
        return NextResponse.json(
          {
            error: "AMBIGUOUS_APARTMENT",
            bloco,
            apartamento,
            residents: (users || []).map((r: any) => r?.nome).filter(Boolean),
          },
          { status: 400 }
        )
      }
    }

    const { data: inserted, error: ei } = await supabaseAdmin
      .from(TABLE)
      .insert({
        empresa_entrega: empresa,
        // Ajuste de fuso: Supabase usa UTC; você pode armazenar sem offset e formatar na leitura
        data_recebimento: new Date().toISOString(),
        id_apartamento: idApto,
        bloco,
        apartamento,
        nome: destinatario,
        recebido_por: recebidoPor,
      })
      .select("id_encomenda")
      .single()
    if (ei) throw ei
    return NextResponse.json({ ok: true, id: inserted?.id_encomenda, destinatario })
  } catch (e: any) {
    console.error("POST /api/encomendas:", e?.message)
    return NextResponse.json(
      { error: "DB_ERROR", message: e?.message },
      { status: 500 }
    )
  }
}