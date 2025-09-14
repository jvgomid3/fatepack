"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegistrarPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/") // redireciona para a página de login
    }
  }, [router])

  // ...restante do componente...
}