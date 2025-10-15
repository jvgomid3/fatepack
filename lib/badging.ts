// Lightweight helper for the Badging API with safe fallbacks
// Works on supported browsers (Chrome/Edge for Android, some Safari versions)

export function setBadge(count: number) {
  try {
    if (typeof count !== 'number' || count < 0) count = 0
    // Prefer navigator API when running on the page
    if (typeof window !== 'undefined' && 'setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
      return (navigator as any).setAppBadge(count)
    }
    // In case this runs from a service worker context in the future
    if (typeof self !== 'undefined' && 'registration' in self && typeof (self as any).registration?.setAppBadge === 'function') {
      return (self as any).registration.setAppBadge(count)
    }
  } catch {
    // ignore
  }
}

export function clearBadge() {
  try {
    if (typeof window !== 'undefined' && 'clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
      return (navigator as any).clearAppBadge()
    }
    if (typeof self !== 'undefined' && 'registration' in self && typeof (self as any).registration?.clearAppBadge === 'function') {
      return (self as any).registration.clearAppBadge()
    }
  } catch {
    // ignore
  }
}
