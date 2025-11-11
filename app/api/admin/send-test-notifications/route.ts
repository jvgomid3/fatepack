import { NextResponse } from "next/server"
import { sendPush } from "@/lib/server/push"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supa = createClient(supabaseUrl, supabaseKey)

/**
 * Endpoint administrativo para enviar múltiplas notificações de teste
 * Usado para popular Firebase Analytics com eventos
 */
export async function POST(req: Request) {
  try {
    const { bloco, apartamento, quantidade = 10 } = await req.json()

    if (!bloco || !apartamento) {
      return NextResponse.json(
        { error: "Bloco e apartamento são obrigatórios" },
        { status: 400 }
      )
    }

    // 1. Buscar apartamento
    const { data: aptoData, error: aptoError } = await supa
      .from("apartamento")
      .select("id_apartamento")
      .eq("bloco", bloco)
      .eq("apartamento", apartamento)
      .maybeSingle()

    if (aptoError || !aptoData) {
      return NextResponse.json(
        { error: "Apartamento não encontrado" },
        { status: 404 }
      )
    }

    // 2. Buscar moradores do apartamento
    const { data: residentRows } = await supa
      .from("usuario")
      .select("id_usuario")
      .eq("id_apartamento", aptoData.id_apartamento)

    if (!residentRows || residentRows.length === 0) {
      return NextResponse.json(
        { error: "Nenhum morador encontrado neste apartamento" },
        { status: 404 }
      )
    }

    const residentIds = residentRows.map((r: any) => r.id_usuario)

    // 3. Buscar subscriptions dos moradores
    const { data: subs, error: subsError } = await supa
      .from("push_subscription")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", residentIds)

    if (subsError || !subs || subs.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma subscription ativa encontrada para este apartamento" },
        { status: 404 }
      )
    }

    console.log(`[Test Notifications] Enviando ${quantidade} notificações para ${subs.length} usuário(s)`)

    // 4. Enviar múltiplas notificações de teste
    const notifications = []
    const tipos = [
      { title: "📦 Nova encomenda", body: "Encomenda de teste chegou!", tag: "test-encomenda" },
      { title: "📢 Aviso importante", body: "Teste de aviso geral", tag: "test-aviso" },
      { title: "✅ Retirada confirmada", body: "Teste de confirmação", tag: "test-retirada" },
      { title: "🔔 Lembrete", body: "Você tem encomendas pendentes", tag: "test-lembrete" },
      { title: "🎉 Bem-vindo", body: "Teste de boas-vindas", tag: "test-welcome" },
    ]

    for (let i = 0; i < quantidade; i++) {
      const tipo = tipos[i % tipos.length]
      const timestamp = new Date().toISOString()
      
      const payload = {
        title: `${tipo.title} #${i + 1}`,
        body: `${tipo.body} (${timestamp})`,
        url: "/encomendas",
        tag: `${tipo.tag}-${Date.now()}-${i}`,
        timestamp,
      }

      // Enviar para todos os usuários
      const results = await Promise.allSettled(
        subs.map((s: any) =>
          sendPush(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        )
      )

      const sucessos = results.filter((r) => r.status === "fulfilled").length
      const falhas = results.filter((r) => r.status === "rejected").length

      notifications.push({
        numero: i + 1,
        payload,
        sucessos,
        falhas,
      })

      // Pequeno delay entre notificações para não sobrecarregar
      if (i < quantidade - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    const totalSucessos = notifications.reduce((sum, n) => sum + n.sucessos, 0)
    const totalFalhas = notifications.reduce((sum, n) => sum + n.falhas, 0)

    console.log(`[Test Notifications] Concluído: ${totalSucessos} sucessos, ${totalFalhas} falhas`)

    return NextResponse.json({
      ok: true,
      message: `${quantidade} notificações enviadas com sucesso`,
      detalhes: {
        bloco,
        apartamento,
        usuarios: subs.length,
        notificacoes_enviadas: quantidade,
        total_sucessos: totalSucessos,
        total_falhas: totalFalhas,
      },
      logs: notifications,
    })
  } catch (e: any) {
    console.error("[Test Notifications] Erro:", e)
    return NextResponse.json(
      { error: e.message || "Erro ao enviar notificações" },
      { status: 500 }
    )
  }
}
