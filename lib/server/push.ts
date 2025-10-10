import "server-only"
import webpush from "web-push"

let configured = false

function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com"
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY envs for Web Push")
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export type PushSubscriptionRecord = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPush(subscription: PushSubscriptionRecord, payload: any) {
  ensureConfigured()
  const opts = { TTL: 30 }
  const data = JSON.stringify(payload)
  try {
    await webpush.sendNotification(subscription as any, data, opts)
  } catch (e: any) {
    // surface errors to caller; they may clean up invalid subscriptions (410 Gone)
    throw e
  }
}
