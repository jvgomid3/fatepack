"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Capitaliza a primeira letra (ignora espaços iniciais)
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

// Formata telefone para (99) 99999-9999 ou (99) 9999-9999
function formatPhoneBR(input: string): string {
  const d = String(input || "").replace(/\D/g, "")
  if (!d) return ""
  // 11 dígitos -> (99) 99999-9999
  if (d.length >= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
  // 10 dígitos -> (99) 9999-9999
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`
  // parcialmente digitado: formatação progressiva
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
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

  const [loginEmail, setLoginEmail] = useState("")
  const [loginSenha, setLoginSenha] = useState("")
  const [loginErr, setLoginErr] = useState("")

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
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr("")
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setLoginErr(data?.error || "Falha no login")
        return
      }
      localStorage.setItem("token", data.token)
      localStorage.setItem("userName", data.nome || "")
      localStorage.setItem("userType", data.tipo || "")
      localStorage.setItem("userBlock", data.bloco || "")
      localStorage.setItem("userApartment", data.apto || data.apartamento || "")
      window.location.href = "/encomendas"
    } catch {
      setLoginErr("Falha no login")
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

  // --- Estados da seção "Criar Conta" ---
  const [caEmail, setCaEmail] = useState("")
  const [caFound, setCaFound] = useState<any>(null)
  const [caBusy, setCaBusy] = useState(false)
  const [caCodigo, setCaCodigo] = useState("")
  const [caNovaSenha, setCaNovaSenha] = useState("")
  // mensagens separadas: busca (acima do Buscar) e redefinição (acima do botão Redefinir)
  const [caSearchMsg, setCaSearchMsg] = useState("")
  const [caResetMsg, setCaResetMsg] = useState("")
  // Estados da seção "Criar Conta"
  const [caResetOk, setCaResetOk] = useState(false)

  const goToLoginSection = () => {
    const el = document.getElementById("login") || document.querySelector('[data-section="login"]')
    if (el && "scrollIntoView" in el) {
      ;(el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      // fallback: ancora na URL (se existir um #login) ou vai para o topo
      if (window.location.hash !== "#login") window.location.hash = "#login"
      else window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const buscarUsuario = async () => {
    setCaSearchMsg("")
    setCaFound(null)
    if (!caEmail) {
      setCaSearchMsg("Informe o e-mail.")
      return
    }
    setCaResetOk(false) // nova busca: volta ao estado normal
    try {
      setCaBusy(true)
      const res = await fetch(`/api/usuario?email=${encodeURIComponent(caEmail)}`, { credentials: "include" })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        const msg = err?.error || (res.status === 404 ? "Usuário não encontrado" : "Erro ao buscar usuário")
        setCaSearchMsg(msg)
        return
      }
      const data = await res.json().catch(() => null)
      if (!data) throw new Error("Resposta inválida do servidor")
      setCaFound({ ...data, telefoneFmt: formatPhoneBR(data.telefone) })
      setCaResetMsg("") // limpa mensagens antigas de redefinição
      setCaResetOk(false)
    } catch (e: any) {
      setCaSearchMsg(e?.message || "Erro ao buscar usuário")
    } finally {
      setCaBusy(false)
    }
  }

  const redefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setCaResetMsg("")
    if (!caFound) {
      setCaResetMsg("Busque o usuário pelo e-mail antes de redefinir a senha.")
      return
    }
    if (caCodigo !== "1234") {
      setCaResetMsg("❌ Código de confirmação inválido.")
      return
    }
    if (!caNovaSenha) {
      setCaResetMsg("Informe a nova senha.")
      return
    }
    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: caEmail, senha: caNovaSenha, codigo: caCodigo }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || "Erro ao redefinir senha")
      setCaResetMsg("✅ Senha redefinida com sucesso!")
      setCaCodigo("")
      setCaNovaSenha("")
      setCaResetOk(true) // ativa o botão "Fazer Login"
    } catch (e: any) {
      setCaResetMsg(e?.message || "Erro ao redefinir senha")
      setCaResetOk(false)
    }
  }

  // estilos das mensagens (erro e sucesso)
  const msgBoxBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 14,
    textAlign: "center",
    margin: "6px 0 8px",
  }
  const msgBoxError: React.CSSProperties = {
    ...msgBoxBase,
    background: "#ffe6ea",          // rosa claro
    border: "1px solid #f43f5e",    // borda vermelha
    color: "#9f1239",               // texto vermelho escuro
  }
  const msgBoxSuccess: React.CSSProperties = {
    ...msgBoxBase,
    background: "#e6ffed",          // verde claro
    border: "1px solid #22c55e",    // borda verde
    color: "#166534",               // texto verde escuro
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
            <form onSubmit={handleLogin} autoComplete="on">
              <div className="form-group">
                <label htmlFor="email">E-mail:</label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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
                  name="senha"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
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

              {loginErr && (
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
                  {loginErr}
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
            <form onSubmit={redefinirSenha} className="criar-conta-form" autoComplete="on">
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Insira seu e-mail"
                  value={caEmail}
                  onChange={(e) => setCaEmail(e.target.value)}
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  required
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      buscarUsuario()
                    }
                  }}
                />
              </div>

              {caSearchMsg && (
                <div style={msgBoxError}>{caSearchMsg}</div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <button type="button" className="btn btn-primary" onClick={buscarUsuario} disabled={caBusy}>
                  {caBusy ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {caFound && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input type="text" className="form-input" value={caFound?.nome || ""} readOnly />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={caFound?.telefoneFmt || caFound?.telefone || ""}
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bloco</label>
                    <input
                      type="text"
                      className="form-input"
                      value={caFound?.bloco ? `Bloco ${caFound.bloco}` : ""}
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apartamento</label>
                    <input
                      type="text"
                      className="form-input"
                      value={caFound?.apartamento ? `Apartamento ${caFound.apartamento}` : ""}
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Código de confirmação</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Insira o código recebido"
                      value={caCodigo}
                      onChange={(e) => setCaCodigo(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nova senha</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Digite a nova senha"
                      value={caNovaSenha}
                      onChange={(e) => setCaNovaSenha(e.target.value)}
                      required
                    />
                  </div>

                  {caResetMsg && (
                    <div style={/\bsucesso\b/i.test(caResetMsg) ? msgBoxSuccess : msgBoxError}>
                      {caResetMsg}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    {caResetOk ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => window.location.reload()} // F5
                        title="Atualizar a página"
                      >
                        Fazer Login
                      </button>
                    ) : (
                      <button type="submit" className="btn btn-primary">Redefinir senha</button>
                    )}
                  </div>
                </>
              )}
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
