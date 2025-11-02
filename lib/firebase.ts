import { initializeApp, getApps, getApp } from "firebase/app"
import { getAnalytics, logEvent, Analytics } from "firebase/analytics"
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging"

// 🔥 Configuração do Firebase - SUBSTITUIR com suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opcional
}

// Inicializar Firebase (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Analytics (apenas no browser)
let analytics: Analytics | null = null
if (typeof window !== "undefined") {
  analytics = getAnalytics(app)
}

// Messaging (apenas no browser)
let messaging: Messaging | null = null
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  messaging = getMessaging(app)
}

// 📊 Funções de Analytics
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, params)
    console.log(`[Firebase Analytics] ${eventName}`, params)
  }
}

// 🔔 Eventos específicos de notificação
export const trackNotificationReceived = (payload: any) => {
  trackEvent("notification_received", {
    title: payload?.notification?.title,
    body: payload?.notification?.body,
    timestamp: new Date().toISOString(),
  })
}

export const trackNotificationClicked = (payload: any) => {
  trackEvent("notification_clicked", {
    title: payload?.notification?.title,
    body: payload?.notification?.body,
    timestamp: new Date().toISOString(),
  })
}

export const trackNotificationPermission = (status: "granted" | "denied" | "default") => {
  trackEvent("notification_permission", {
    status,
    timestamp: new Date().toISOString(),
  })
}

// 🔑 Obter token FCM para receber notificações
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn("[Firebase] Messaging não disponível")
    return null
  }

  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error("[Firebase] VAPID Key não configurada no .env")
      return null
    }

    const currentToken = await getToken(messaging, { vapidKey })
    if (currentToken) {
      console.log("[Firebase] FCM Token obtido:", currentToken.substring(0, 20) + "...")
      trackEvent("fcm_token_generated", { token_length: currentToken.length })
      return currentToken
    } else {
      console.warn("[Firebase] Nenhum token disponível. Solicite permissão de notificação.")
      return null
    }
  } catch (err) {
    console.error("[Firebase] Erro ao obter token:", err)
    return null
  }
}

// 🔔 Listener para notificações em foreground
export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) return

  onMessage(messaging, (payload) => {
    console.log("[Firebase] Mensagem recebida em foreground:", payload)
    trackNotificationReceived(payload)
    callback(payload)
  })
}

export { app, analytics, messaging }
