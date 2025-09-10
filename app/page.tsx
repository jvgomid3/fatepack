"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Capitaliza a primeira letra (ignora espaços iniciais)
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

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
  const [registerLoading, setRegisterLoading] = useState(false) // <- novo
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
    // removido: autenticação hardcoded do "admin"
    // a validação de admin vem do backend (campo `tipo`)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
        credentials: "include",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Falha no login")

      // grava dados retornados pelo backend (backend deve retornar `tipo`)
      const tipo = data?.tipo || "morador"
      localStorage.setItem("userType", String(tipo))
      localStorage.setItem("userName", data?.name || data?.email?.split?.("@")?.[0] || "")
      if (data?.block) localStorage.setItem("userBlock", String(data.block))
      if (data?.apartment) localStorage.setItem("userApartment", String(data.apartment))

      // redireciona conforme role: admins -> /registrar, demais -> /inicio
      if (tipo === "admin") {
        router.push("/registrar")
      } else {
        router.push("/inicio")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar")
    }
  }

  // Handler genérico de mudanças no formulário de cadastro
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: name === "name" ? capFirst(value) : value,
    }))
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
      setRegisterLoading(true) // <- inicia animação
      const payload = {
        name: capFirst(formData.name.trim()),
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        block: formData.block,
        apartment: formData.apartment,
        tipo: "morador",
      }

      const r1 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })

      if (!r1.ok) {
        const p1 = await r1.json().catch(() => null)
        throw new Error(p1?.error || "Erro ao cadastrar")
      }

      // lê o nome retornado pelo register; se não vier, usa o nome do form como fallback
      const created = await r1.json().catch(() => null)
      let displayName = created?.nome || created?.name || ""
      if (!displayName && formData.name) {
        displayName = capFirst(formData.name.trim())
      }

      // remove possíveis dados de sessão antigos e grava os dados do novo usuário
      try {
        localStorage.removeItem("userType")
        localStorage.removeItem("userName")
        localStorage.removeItem("userBlock")
        localStorage.removeItem("userApartment")
        const userType = created?.tipo || "morador"
        localStorage.setItem("userType", String(userType))
        localStorage.setItem("userName", String(displayName))
        localStorage.setItem("userBlock", String(created?.block ?? formData.block ?? ""))
        localStorage.setItem("userApartment", String(created?.apartment ?? formData.apartment ?? ""))
      } catch (e) {
        /* ignore if storage not available */
      }

      // redireciona para /inicio incluindo o nome (se existir)
      router.push(`/inicio${displayName ? `?nome=${encodeURIComponent(displayName)}` : ""}`)
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar")
    } finally {
      setRegisterLoading(false) // <- encerra animação
    }
  }

  return (
    <>
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

              {/* Esqueci minha senha - somente no formulário de Login */}
              <Link
                href="/recuperar-senha"
                className="forgot-password"
                style={{
                  marginTop: "8px",
                  color: "#0ea5e9",
                  cursor: "pointer",
                  textAlign: "center",
                  fontSize: "14px",
                  width: "100%",
                  display: "block",
                  textDecoration: "none",
                }}
              >
                Esqueci minha senha
              </Link>

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
                  onChange={handleRegisterChange}
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
                    width: "85%", // garante largura total
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
                    width: "84.5%", // garante largura total
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
                className={`btn btn-primary ${registerLoading ? "btn-loading" : ""}`}
                disabled={registerLoading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginTop: "1rem",
                  opacity: registerLoading ? 0.95 : 1,
                  cursor: registerLoading ? "not-allowed" : "pointer",
                }}
              >
                {registerLoading ? "Cadastrando..." : "Cadastrar"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* força labels acima dos inputs na seção "Criar conta" */}
      <style jsx>{`
        /* garante o label em bloco e espaço entre label e input */
        .form-group label,
        .form-group .form-label {
          display: block !important;
          margin-bottom: 8px !important;
        }

        /* inputs/selects/textarea sempre em linha nova e ocupando toda a largura do grupo */
        .form-group input,
        .form-group select,
        .form-group textarea,
        .form-group .form-input,
        .form-group .form-select {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `}</style>

      {/* estilos da animação */}
      <style jsx>{`
        @keyframes btnGradientMove {
          0%   { background-position: 0% 0%; }
          100% { background-position: -200% 0%; }
        }
        .btn-loading {
          position: relative;
          color: #fff !important;
          background-image: linear-gradient(
            90deg,
            var(--primary, #06b6d4) 0%,
            #3fd5e6 50%,
            var(--primary, #06b6d4) 100%
          );
          background-size: 200% 100%;
          animation: btnGradientMove 1.1s linear infinite;
          border: none;
        }
      `}</style>
    </>
  )
}
