"use client"

// Convert a base64 URL-safe string to a Uint8Array (required by PushManager)
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function enablePushNotifications(getToken: () => string | null) {
  if (typeof window === 'undefined') return { ok: false, reason: 'SERVER' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'UNSUPPORTED' }
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'DENIED' }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    // already subscribed; send to server just in case
    await sendSubscription(existing, getToken())
    return { ok: true }
  }

  let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    // Try runtime fetch from API as a fallback
    try {
      const resp = await fetch('/api/push/public-key', { cache: 'no-store' })
      const json: any = await resp.json().catch(() => null)
      if (json?.ok && json?.publicKey) {
        vapidPublicKey = json.publicKey
      }
    } catch {}
  }
  if (!vapidPublicKey) return { ok: false, reason: 'MISSING_VAPID' }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  await sendSubscription(sub, getToken())
  return { ok: true }
}

async function sendSubscription(sub: PushSubscription, token: string | null) {
  const body = JSON.stringify(sub)
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  }).catch(() => {})
}
