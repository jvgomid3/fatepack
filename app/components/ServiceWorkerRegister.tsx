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
  }, [])
  return null
}
