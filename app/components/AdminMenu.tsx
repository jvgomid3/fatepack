"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function AdminMenu() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(localStorage.getItem("userType") === "admin")
  }, [])

  if (!isAdmin) return null

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link href="/registrar" className="btn btn-primary">Registrar encomendas</Link>
      <Link href="/historico" className="btn">Histórico</Link>
    </div>
  )
}