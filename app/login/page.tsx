"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setError("")
  }, [username, password])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!username || !password) {
      setError("Preencha usuário e senha.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "E-mail ou senha inválidos")
        setLoading(false)
        return
      }

      // grava sessão simples no localStorage (teste)
  localStorage.setItem("token", data.token || "")
  localStorage.setItem("userName", data.user?.nome || data.user?.displayName || username)
  localStorage.setItem("displayName", data.user?.nome || data.user?.displayName || username)
  localStorage.setItem("userType", data.user?.tipo || data.tipo || "user")
  if (data.user?.telefone) localStorage.setItem("userPhone", data.user.telefone)
  if (data.user?.bloco) localStorage.setItem("userBlock", String(data.user.bloco))
  if (data.user?.apto || data.user?.apartamento) localStorage.setItem("userApartment", String(data.user.apto ?? data.user.apartamento))
  if (username) localStorage.setItem("userEmail", String(username).trim().toLowerCase())

  const role = String(data?.user?.tipo || data?.tipo || '').toLowerCase()
  router.push(data.redirect || (role === 'admin' ? '/inicio-admin' : '/inicio'))
    } catch (err) {
      console.error("Login error:", err)
      setError("Erro ao autenticar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "24px auto" }}>
      <h1 style={{ textAlign: "center" }}>FatePack</h1>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>E-mail ou usuário</label>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(lowerFirst(e.target.value))}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Senha</label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6 }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 12, color: "#b91c1c", background: "#fee2e2", padding: 8, borderRadius: 6 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            background: "#06b6d4",
            color: "#fff",
            fontWeight: 700,
            border: "none",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}