"use client"

import { useEffect } from "react"
import { getFCMToken, onMessageListener, trackNotificationPermission } from "@/lib/firebase"

export default function FirebaseInit() {
  useEffect(() => {
    // Só inicializar se estiver no browser
    if (typeof window === "undefined") return

    const initFirebase = async () => {
      try {
        // Verificar se Firebase está configurado
        const isConfigured = 
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        
        if (!isConfigured) {
          console.warn("[Firebase] Firebase não configurado. Pulando inicialização.")
          return
        }

        // 1. Verificar permissão atual
        if (!("Notification" in window)) {
          console.warn("[Firebase] Notificações não suportadas neste navegador")
          return
        }

        const permission = Notification.permission
        console.log("[Firebase] Permissão atual:", permission)
        trackNotificationPermission(permission)

        // 2. Se já tem permissão, obter token FCM
        if (permission === "granted") {
          const token = await getFCMToken()
          if (token) {
            console.log("[Firebase] Token FCM obtido com sucesso")
            // TODO: Enviar token para servidor para vincular ao usuário
            // await fetch('/api/user/fcm-token', {
            //   method: 'POST',
            //   body: JSON.stringify({ token }),
            // })
          }
        }

        // 3. Listener para notificações em foreground
        onMessageListener((payload) => {
          console.log("[Firebase] Notificação recebida em foreground:", payload)
          
          // Mostrar notificação customizada (opcional)
          if (Notification.permission === "granted") {
            new Notification(payload.notification?.title || "Nova notificação", {
              body: payload.notification?.body,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-192x192.png",
            })
          }
        })

        // 4. Listener para eventos do Service Worker via Broadcast Channel
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("firebase-analytics")
          channel.onmessage = (event) => {
            const { name, params } = event.data
            console.log("[Firebase] Evento recebido do SW:", name, params)
            
            // Enviar para Firebase Analytics
            import("@/lib/firebase").then(({ trackEvent }) => {
              trackEvent(name, params)
            })
          }
        }
      } catch (error) {
        console.error("[Firebase] Erro na inicialização:", error)
      }
    }

    initFirebase()
  }, [])

  return null // Componente invisível
}
