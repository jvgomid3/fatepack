"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if ("serviceWorker" in navigator) {
      const ready = () => navigator.serviceWorker.register("/sw.js").catch(() => {})
      if (document.readyState === "complete") {
        ready()
      } else {
        window.addEventListener("load", ready, { once: true })
      }
    }
    // Patch window.fetch to automatically include Authorization header for
    // same-origin API requests when a token is present in localStorage.
    try {
      const origFetch = window.fetch.bind(window)
      // avoid double-patching
      if (!(window as any).__fatepack_fetch_patched) {
        ;(window as any).__fatepack_fetch_patched = true
  window.fetch = async (input: any, init?: any) => {
          try {
            const token = localStorage.getItem("token") || ""
            let url = ""
            if (typeof input === "string") url = input
            else if (input instanceof Request) url = input.url
            // Only modify same-origin /api requests
            try {
              const u = new URL(url, window.location.origin)
              if (u.origin === window.location.origin && u.pathname.startsWith("/api")) {
                init = init ? { ...init } : {}
                init.headers = init.headers ? new Headers(init.headers) : new Headers()
                if (token) init.headers.set("Authorization", `Bearer ${token}`)
              }
            } catch {
              // ignore URL parse errors
            }
          } catch {
            // swallow
          }
          return origFetch(input, init)
        }
      }
    } catch {
      // ignore if environment doesn't allow patching
    }
  }, [])
  return null
}
