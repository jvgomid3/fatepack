import { NextResponse } from "next/server"
import { sendPush } from "@/lib/server/push"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supa = createClient(supabaseUrl, supabaseKey)

/**
 * Endpoint administrativo para enviar 1 notificação de teste por vez
 * Usado para popular Firebase Analytics com eventos (envio individual com debug)
 */
export async function POST(req: Request) {
  try {
    const { bloco, apartamento } = await req.json()

    if (!bloco || !apartamento) {
      return NextResponse.json(
        { error: "Bloco e apartamento são obrigatórios" },
        { status: 400 }
      )
    }

    console.log(`[Test] 🧪 Enviando notificação para Bloco ${bloco}, Apto ${apartamento}`)

    // 1. Buscar apartamento
    const { data: aptoData, error: aptoError } = await supa
      .from("apartamento")
      .select("id_apartamento")
      .eq("bloco", bloco)
      .eq("apartamento", apartamento)
      .maybeSingle()

    if (aptoError || !aptoData) {
      console.error(`[Test] ❌ Apartamento não encontrado:`, aptoError)
      return NextResponse.json(
        { 
          error: `Apartamento ${bloco}/${apartamento} não encontrado`, 
          debug: aptoError?.message 
        },
        { status: 404 }
      )
    }

    console.log(`[Test] ✅ Apartamento encontrado: ID ${aptoData.id_apartamento}`)

    // 2. Buscar moradores do apartamento
    const { data: residentRows } = await supa
      .from("usuario")
      .select("id_usuario")
      .eq("id_apartamento", aptoData.id_apartamento)

    if (!residentRows || residentRows.length === 0) {
      console.error(`[Test] ❌ Nenhum morador encontrado`)
      return NextResponse.json(
        { error: "Nenhum morador encontrado neste apartamento" },
        { status: 404 }
      )
    }

    const residentIds = residentRows.map((r: any) => r.id_usuario)
    console.log(`[Test] 👥 Moradores encontrados: ${residentIds.length}`)

    // 3. Buscar subscriptions dos moradores
    const { data: subs, error: subsError } = await supa
      .from("push_subscription")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", residentIds)

    if (subsError || !subs || subs.length === 0) {
      console.error(`[Test] ❌ Nenhuma subscription encontrada:`, subsError)
      return NextResponse.json(
        { 
          error: "Nenhuma subscription ativa encontrada para este apartamento",
          debug: {
            moradores: residentIds.length,
            error: subsError?.message,
            hint: "O usuário precisa permitir notificações no navegador/app primeiro"
          }
        },
        { status: 404 }
      )
    }

    console.log(`[Test] 🔔 Subscriptions encontradas: ${subs.length}`)

    // 4. Criar payload de teste
    const now = new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })
    const randomEmoji = ["📦", "📢", "✅", "🔔", "🎉"][Math.floor(Math.random() * 5)]
    
    const payload = {
      title: `${randomEmoji} Teste ${Date.now().toString().slice(-4)}`,
      body: `Notificação de teste - ${now}`,
      url: "/historico",
      tag: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    console.log(`[Test] 📤 Payload:`, payload)

    // 5. Enviar para TODAS as subscriptions
    const results = await Promise.allSettled(
      subs.map(async (s: any, index: number) => {
        try {
          console.log(`[Test] 📨 Enviando para subscription ${index + 1}/${subs.length}...`)
          
          await sendPush(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
          
          console.log(`[Test] ✅ Enviada com sucesso para ${index + 1}`)
          return { success: true, user_id: s.user_id, endpoint: s.endpoint.substring(0, 60) }
        } catch (error: any) {
          console.error(`[Test] ❌ Erro ao enviar para ${index + 1}:`, {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body
          })
          
          return { 
            success: false, 
            user_id: s.user_id, 
            error: error.message,
            statusCode: error.statusCode 
          }
        }
      })
    )

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length

    console.log(`[Test] 🎯 Resultado: ${successful} sucesso, ${failed} falhas`)

    return NextResponse.json({
      ok: true,
      message: successful > 0 
        ? `✅ Notificação enviada com sucesso para ${successful} dispositivo(s)!`
        : `❌ Falha ao enviar (${failed} erro(s))`,
      detalhes: {
        apartamento: { bloco, apartamento, id: aptoData.id_apartamento },
        moradores: residentIds.length,
        subscriptions: subs.length,
        sucessos: successful,
        falhas: failed,
        payload,
        timestamp: now
      },
      debug: results.map((r, i) => ({
        subscription: i + 1,
        status: r.status,
        result: r.status === "fulfilled" ? r.value : { error: "rejected" }
      }))
    })
  } catch (e: any) {
    console.error("[Test] 💥 Erro crítico:", e)
    return NextResponse.json(
      { error: e.message || "Erro ao enviar notificação", stack: e.stack },
      { status: 500 }
    )
  }
}
