import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Endpoint chamado pelo Service Worker quando uma notificação é RECEBIDA
 * Retorna script para enviar evento ao Firebase Analytics no client-side
 */
export async function POST(req: Request) {
  try {
    const { title, body, tag, timestamp } = await req.json()
    
    console.log("[Firebase Analytics] Notificação recebida:", {
      title,
      body,
      tag,
      timestamp,
    })

    // Salvar no banco de dados (opcional - para analytics customizado)
    // Descomente se quiser criar a tabela notification_analytics
    /*
    await query(`
      INSERT INTO notification_analytics (event_type, title, body, tag, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, ['received', title, body, tag])
    */
    
    // Retornar dados para serem enviados ao Firebase Analytics via broadcast
    return NextResponse.json({ 
      ok: true,
      event: {
        name: "notification_received",
        params: {
          notification_title: title,
          notification_tag: tag,
          timestamp,
        }
      }
    })
  } catch (error) {
    console.error("[Analytics] Erro ao processar notificação recebida:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
