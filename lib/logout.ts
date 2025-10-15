"use client"

import { clearBadge } from "./badging"

// Centralized logout: clears all locally stored session/user data and app badges.
// Does NOT navigate by default; callers can redirect with router.replace("/") or set hardReload=true.
export function performLogout(options?: { hardReload?: boolean }) {
  try {
    const keys = [
      "token",
      "userType",
      "userName",
      "userBlock",
      "userApartment",
      "currentUser",
      "user",
      "displayName",
      "userEmail",
      "email",
      "telefone",
      "userPhone",
      // caches/state
      "avisosReadIds",
      "encomendas",
      "historico_encomendas",
      "packages",
    ] as const
    for (const k of keys) {
      try { localStorage.removeItem(k) } catch {}
    }
  } catch {
    // ignore storage errors
  }
  try { clearBadge() } catch {}

  if (options?.hardReload) {
    try { window.location.assign("/") } catch {}
  }
}
