import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Endpoint para service worker enviar eventos de clique
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { title, url, timestamp } = body

    console.log("[Analytics] Notificação clicada:", { title, url, timestamp })

    // Aqui você pode:
    // 1. Salvar no banco de dados
    // 2. Enviar para Firebase Analytics via Admin SDK
    // 3. Enviar para Google Analytics
    // 4. Incrementar contador no Redis/Postgres

    // Exemplo: Salvar no banco (opcional)
    // await db.query(`
    //   INSERT INTO notification_clicks (title, clicked_at)
    //   VALUES ($1, $2)
    // `, [title, timestamp])

    // Retornar dados para serem enviados ao Firebase Analytics via broadcast
    return NextResponse.json({ 
      ok: true,
      event: {
        name: "notification_clicked",
        params: {
          notification_title: title,
          notification_url: url,
          timestamp,
        }
      }
    })
  } catch (e: any) {
    console.error("[Analytics] Erro:", e?.message)
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}
