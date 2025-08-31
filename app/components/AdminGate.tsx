"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminGate() {
  const router = useRouter()
  useEffect(() => {
    const t = (typeof window !== "undefined" && localStorage.getItem("userType")) || ""
    if (t !== "admin") router.replace("/encomendas")
  }, [router])
  return null
}