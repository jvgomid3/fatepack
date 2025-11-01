"use client"
import React, { useState } from "react"
import { Building2, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Capitaliza a primeira letra (ignora espaços iniciais)
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

// deixa a primeira letra minúscula (para campos de e-mail)
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // Se já estiver autenticado (token no localStorage), redireciona direto para a área logada
  React.useEffect(() => {
    try {
      const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!t) {
        setIsCheckingAuth(false)
        return
      }
      const role = (localStorage.getItem('userType') || '').toLowerCase()
      const dest = role === 'admin' ? '/inicio-admin' : '/inicio'
      if (window.location.pathname !== dest) {
        window.location.replace(dest)
      }
    } catch {
      setIsCheckingAuth(false)
    }
  }, [])
  
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
  const [loginSenhaVisible, setLoginSenhaVisible] = useState(false)

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
      localStorage.setItem("userName", data.user?.nome || data.nome || "")
      localStorage.setItem("userType", data.user?.tipo || data.tipo || "")
      localStorage.setItem("userBlock", data.user?.bloco || data.bloco || "")
      localStorage.setItem("userApartment", data.user?.apto || data.user?.apartamento || data.apto || data.apartamento || "")
      if (data.user?.telefone || data.telefone) {
        localStorage.setItem("userPhone", String(data.user?.telefone || data.telefone))
      }
      // persiste email do usuário para futuras leituras (ex.: /inicio buscar nome no DB)
      if (loginEmail) localStorage.setItem("userEmail", String(loginEmail).trim().toLowerCase())
      // redireciona conforme papel: usa redirect da API (preferencial), senão morador => /inicio
      const role = String(data?.tipo || data?.user?.tipo || '').toLowerCase()
      const destination = data?.redirect || (role === 'admin' ? '/historico' : '/inicio')
      window.location.href = destination
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
  if (formData.phone) localStorage.setItem("userPhone", String(formData.phone))
  if (formData.email) localStorage.setItem("userEmail", String(formData.email).trim().toLowerCase())
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
  const [caNovaSenhaVisible, setCaNovaSenhaVisible] = useState(false)
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
      // first call the public existence check to avoid hitting the protected GET when anonymous
      const verifyRes = await fetch("/api/auth/verificar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: caEmail }),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => null)
        const msg = err?.error || (verifyRes.status === 404 ? "Usuário não encontrado" : "Erro ao buscar usuário")
        setCaSearchMsg(msg)
        return
      }

      // exists: allow the user to proceed (show reset fields). If we have a token, fetch full details.
      const token = String(localStorage.getItem("token") || "")
      if (token) {
        const res = await fetch(`/api/usuario?email=${encodeURIComponent(caEmail)}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          const msg = err?.error || (res.status === 404 ? "Usuário não encontrado" : "Erro ao buscar usuário")
          setCaSearchMsg(msg)
          return
        }
        const data = await res.json().catch(() => null)
        if (!data) throw new Error("Resposta inválida do servidor")
        setCaFound({ ...data, telefoneFmt: formatPhoneBR(data.telefone) })
      } else {
        // anonymous: mark as found but don't expose private fields
        setCaFound({ exists: true })
      }
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
    if (!caCodigo || String(caCodigo).trim().length === 0) {
      setCaResetMsg("Informe o código de confirmação.")
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
        body: JSON.stringify({ email: caEmail, senha: caNovaSenha, codigo: String(caCodigo).trim() }),
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

  // Mostra loading enquanto verifica autenticação para evitar flash de conteúdo
  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background)',
      }}>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `
        }} />
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <>
      <div className="container">
        <div className="header">
          <div className="brand-badge" aria-hidden="true">
            <Building2 className="brand-icon" />
          </div>
          <h1>FatePack</h1>
          <p>
            Sistema de Gestão de Encomendas
            <br />
            <br />
            Condomínio Abaeté
            <br />
            Rua Eduardo Lima, 4000 Vila Esperança
            <br />
            Campinas - SP
          </p>
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
                  onChange={(e) => setLoginEmail(lowerFirst(e.target.value))}
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
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Senha:</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={loginSenhaVisible ? "text" : "password"}
                    id="password"
                    name="senha"
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    style={{
                      padding: "14px",
                      paddingRight: "44px", // espaço para o botão do olhinho
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "16px",
                      width: "100%", // garante largura total
                      boxSizing: "border-box", // garante que padding não ultrapasse o card
                    }}
                  />

                  <button
                    type="button"
                    aria-label={loginSenhaVisible ? "Ocultar senha" : "Mostrar senha"}
                    title={loginSenhaVisible ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setLoginSenhaVisible((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      // centraliza verticalmente no meio do input
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      padding: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#64748b",
                    }}
                  >
                    {loginSenhaVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                  onChange={(e) => setCaEmail(lowerFirst(e.target.value))}
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
                    <div style={{ position: "relative" }}>
                      <input
                        type={caNovaSenhaVisible ? "text" : "password"}
                        className="form-input"
                        placeholder="Digite a nova senha"
                        value={caNovaSenha}
                        onChange={(e) => setCaNovaSenha(e.target.value)}
                        required
                        style={{ paddingRight: 44 }}
                      />

                      <button
                        type="button"
                        aria-label={caNovaSenhaVisible ? "Ocultar senha" : "Mostrar senha"}
                        title={caNovaSenhaVisible ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setCaNovaSenhaVisible((v) => !v)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          padding: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#64748b",
                        }}
                      >
                        {caNovaSenhaVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
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

      {/* estilos visuais da página de login - apenas layout/estética */}
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px 16px;
          background: radial-gradient(120% 140% at 0% 0%, rgba(14,165,233,0.55) 0%, rgba(14,165,233,0.15) 35%, rgba(30,58,138,0.15) 60%) ,
                      linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 45%, #0ea5e9 100%);
        }
        .header {
          width: 100%;
          max-width: 420px;
          text-align: center;
          color: #eaf2ff;
        }
        .brand-badge {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          margin: 0 auto 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%),
                      linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%);
          box-shadow: 0 8px 28px rgba(2,6,23,0.25), inset 0 1px 0 rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.25);
        }
        .brand-icon { width: 28px; height: 28px; color: #ffffff; }
        .header h1 {
          margin: 0 0 6px 0;
          font-weight: 800;
          letter-spacing: -0.3px;
          text-shadow: 0 2px 12px rgba(2,6,23,0.25);
          color: #e2e8f0; /* cinza frio que combina com azul */
          font-size: 2.25rem; /* maior que o padrão */
          /* força desabilitar o gradiente global e usa a cor acima */
          -webkit-text-fill-color: #e2e8f0 !important;
          background: none !important;
          -webkit-background-clip: initial !important;
          background-clip: initial !important;
        }
        @media (min-width: 480px) {
          .header h1 { font-size: 2.5rem; }
        }
        .header p {
          margin: 0;
          color: #dbeafe;
          text-align: center;
          line-height: 1.35;
        }
        .card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 16px;
          padding: 22px 18px 20px;
          box-shadow: 0 12px 45px rgba(2,6,23,0.22), 0 2px 8px rgba(2,6,23,0.08);
          border: 1px solid rgba(2,6,23,0.06);
        }
        /* inputs mais elegantes */
        .card input[type="text"],
        .card input[type="email"],
        .card input[type="password"],
        .card .form-input {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }
        .card input:focus,
        .card .form-input:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,.2);
          background: #ffffff;
        }
        .forgot-password:hover { text-decoration: underline; }

        /* botão primário com gradiente azul */
        .btn.btn-primary {
          background-image: linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%);
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 6px 18px rgba(37,99,235,0.28);
          transition: transform .06s ease, box-shadow .2s ease, filter .2s ease;
        }
        .btn.btn-primary:hover { filter: brightness(1.03); box-shadow: 0 10px 24px rgba(37,99,235,0.34); }
        .btn.btn-primary:active { transform: translateY(1px); box-shadow: 0 6px 18px rgba(37,99,235,0.28); }

        /* segmento Login/Criar conta - apenas estética */
        .card > div[style*="display: flex"][style*="overflow: hidden"] {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(2,6,23,0.06) !important;
        }
        .card > div[style*="display: flex"][style*="overflow: hidden"] .btn {
          backdrop-filter: saturate(130%) blur(1px);
        }
      `}</style>

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
