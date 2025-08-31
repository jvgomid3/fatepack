"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    block: "",
    apartment: "",
  })
  const [error, setError] = useState("")
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 11) value = value.slice(0, 11)
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
    setFormData({ ...formData, phone: value })
  }

  // LOGIN SOMENTE VIA BD
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError?.("")

    const emailTrim = formData.email.trim().toLowerCase()
    if (emailTrim === "admin" && formData.password === "admin@admin") {
      localStorage.setItem("userType", "admin")
      localStorage.setItem("userName", "Administrador")
      localStorage.removeItem("userBlock")
      localStorage.removeItem("userApartment")
      router.push("/registrar")
      return
    }

    // 2) Fluxo atual (moradores via BD)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Falha no login")

      localStorage.setItem("userType", data.tipo || "morador")
      localStorage.setItem("userName", data.name || data.email.split("@")[0])
      if (data.block) localStorage.setItem("userBlock", String(data.block))
      if (data.apartment) localStorage.setItem("userApartment", String(data.apartment))

      router.push("/encomendas")
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar")
    }
  }

  // CADASTRO NO BD e depois login no BD
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.block || !formData.apartment) {
      setError("Todos os campos são obrigatórios")
      return
    }

    try {
      // cria no BD
      const r1 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          block: formData.block,
          apartment: formData.apartment,
          tipo: "morador",
        }),
      })
      const p1 = await r1.json().catch(() => null)
      if (!r1.ok) throw new Error(p1?.error || "Erro ao cadastrar")

      // autentica no BD
      const r2 = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })
      const p2 = await r2.json().catch(() => null)
      if (!r2.ok) throw new Error(p2?.error || "Falha ao autenticar")

      localStorage.setItem("userType", p2.tipo || "morador")
      localStorage.setItem("userName", p2.name || formData.email.split("@")[0])
      if (p2.block) localStorage.setItem("userBlock", String(p2.block))
      if (p2.apartment) localStorage.setItem("userApartment", String(p2.apartment))

      router.push("/encomendas")
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar")
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>FatePack</h1>
        <p>Sistema de gerenciamento de encomendas para condomínios</p>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            marginBottom: "2rem",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#f8fafc",
            padding: "4px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setIsLogin(true)}
            className={`btn ${isLogin ? "btn-primary" : ""}`}
            style={{
              flex: 1,
              margin: 0,
              borderRadius: "8px",
              backgroundColor: isLogin ? "var(--primary)" : "transparent",
              color: isLogin ? "white" : "var(--text-muted)",
              border: "none",
              padding: "12px",
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`btn ${!isLogin ? "btn-primary" : ""}`}
            style={{
              flex: 1,
              margin: 0,
              borderRadius: "8px",
              backgroundColor: !isLogin ? "var(--primary)" : "transparent",
              color: !isLogin ? "white" : "var(--text-muted)",
              border: "none",
              padding: "12px",
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
          >
            Criar conta
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">E-mail:</label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Digite seu e-mail"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "100%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Digite sua senha"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "100%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card

                }}
              />
            </div>

            {error && (
              <div
                style={{
                  color: "#e74c3c",
                  textAlign: "center",
                  marginBottom: "1rem",
                  padding: "12px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "8px",
                  fontSize: "14px",
                  border: "1px solid #fecaca",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                marginTop: "1rem",
              }}
            >
              Entrar
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="nome">Nome: </label>
              <input
                type="text"
                id="nome"
                name="name" // <-- Corrigido aqui!
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Insira seu nome"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "85%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail: </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "86%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card

                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha: </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Digite uma senha"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "85%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card

                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefone: </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="block">Bloco: </label>
              <select
                id="block"
                name="block"
                value={formData.block}
                onChange={handleInputChange}
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "85%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card
                }}
              >
                <option value="">Selecione o bloco</option>
                <option value="01">Bloco 01</option>
                <option value="02">Bloco 02</option>
                <option value="03">Bloco 03</option>
                <option value="04">Bloco 04</option>
                <option value="05">Bloco 05</option>
                <option value="06">Bloco 06</option>
                <option value="07">Bloco 07</option>
                <option value="08">Bloco 08</option>
                <option value="09">Bloco 09</option>
                <option value="10">Bloco 10</option>
                <option value="11">Bloco 11</option>
                <option value="12">Bloco 12</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="apartment">Apartamento: </label>
              <select
                id="apartment"
                name="apartment"
                className="form-select"
                value={formData.apartment}
                onChange={handleInputChange}
                required
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "16px",
                  width: "73%", // garante largura total
                  boxSizing: "border-box", // garante que padding não ultrapasse o card
                }}
              >
                <option value="">Selecione o apartamento</option>
                <option value="01">Apartamento 01</option>
                <option value="02">Apartamento 02</option>
                <option value="03">Apartamento 03</option>
                <option value="04">Apartamento 04</option>
                <option value="11">Apartamento 11</option>
                <option value="12">Apartamento 12</option>
                <option value="13">Apartamento 13</option>
                <option value="14">Apartamento 14</option>
                <option value="21">Apartamento 21</option>
                <option value="22">Apartamento 22</option>
                <option value="23">Apartamento 23</option>
                <option value="24">Apartamento 24</option>
                <option value="31">Apartamento 31</option>
                <option value="32">Apartamento 32</option>
                <option value="33">Apartamento 33</option>
                <option value="34">Apartamento 34</option>
              </select>
            </div>

            {error && (
              <div
                style={{
                  color: "#e74c3c",
                  textAlign: "center",
                  marginBottom: "1rem",
                  padding: "12px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "8px",
                  fontSize: "14px",
                  border: "1px solid #fecaca",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                marginTop: "1rem",
              }}
            >
              Cadastrar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
