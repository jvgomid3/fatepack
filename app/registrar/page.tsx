"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { History, LogOut, AlertTriangle, UserRound } from "lucide-react"
import AdminGate from "../components/AdminGate"
import { useRouter } from "next/navigation"

interface Encomenda {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  dataRecebimento: string
  status: string
  isNew: boolean
  recebidoPor?: string // novo
}

// Capitaliza a primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

export default function RegistrarPage() {
  const router = useRouter()
  const isJWT = (t: string) => typeof t === "string" && t.split(".").length === 3
  const logout = () => {
    try {
      localStorage.removeItem("userType")
      localStorage.removeItem("userName")
      localStorage.removeItem("userBlock")
      localStorage.removeItem("userApartment")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("user")
    } catch {}
    router.replace("/")
  // removido reload para evitar flash de layout antigo
  }

  const [bloco, setBloco] = useState("")
  const [apartamento, setApartamento] = useState("")
  const [morador, setMorador] = useState("")
  const [empresa, setEmpresa] = useState("")
  const [empresaIsOutro, setEmpresaIsOutro] = useState(false) // novo
  const [showAlert, setShowAlert] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmEmail, setIsAdmEmail] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  // nome a mostrar na saudação (prefere currentUser, depois localStorage)
  const displayName = (currentUser && (currentUser.name || currentUser.nome)) || (typeof window !== "undefined" ? localStorage.getItem("userName") : null) || "Administrador"

  const [lastRecebidoPor, setLastRecebidoPor] = useState("") // novo

  const blocos = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

  const apartamentos = ["01", "02", "03", "04", "11", "12", "13", "14", "21", "22", "23", "24", "31", "32", "33", "34"]

  const empresas = ["Correios", "Jadlog", "Rodonaves", "Mercado Livre", "Amazon", "Outra empresa"]

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
    setCurrentUser(user)
    setIsAdmin(localStorage.getItem("userType") === "admin")
    // garante que o token seja JWT (apos atualização da API)
    const t = localStorage.getItem("token") || ""
    if (!isJWT(t)) {
      try { localStorage.removeItem("token") } catch {}
      // força novo login
      router.replace("/")
    }
    // define se o e-mail logado é exatamente "adm"
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "")
      .trim()
      .toLowerCase()
    setIsAdmEmail(email === "adm")
  }, [])

  // (removido handleSubmit antigo para evitar confusão; usamos apenas handleRegistrar abaixo)

  const backLinkRef = useRef<HTMLAnchorElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLAnchorElement | null)
    if (linkEl && helloRef.current) {
      const cs = window.getComputedStyle(linkEl)
      helloRef.current.style.color = cs.color
    }
  }, [])

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setNavDims({ left: rect.left, width: rect.width })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  function normalize2(v: string) {
    const n = v.replace(/\D/g, "").trim()
    return n.padStart(2, "0")
  }

  async function handleRegistrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    // Se selecionar "Outra empresa", usamos o valor digitado no input controlado (estado `empresa`)
    const selectedEmpresa = String(fd.get("empresa_entrega") ?? fd.get("empresa") ?? "").trim()
    const empresa_entrega = String(empresaIsOutro ? empresa : selectedEmpresa).trim()
    const bloco = normalize2(String(fd.get("bloco") ?? ""))
    const apartamento = normalize2(String(fd.get("apartamento") ?? fd.get("apto") ?? ""))
  const nome = String(fd.get("nome") ?? fd.get("destinatario") ?? "").trim()
    const recebido_por = String(localStorage.getItem("userName") || "").trim()

    if (!empresa_entrega || !bloco || !apartamento) {
      alert("Preencha Empresa, Bloco e Apartamento.")
      return
    }

    const token = localStorage.getItem("token") || ""
    const res = await fetch("/api/encomendas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: isJWT(token) ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ empresa_entrega, bloco, apartamento, nome, recebido_por }),
    })

    const data = await res.json().catch(() => null)
    if (res.status === 401) {
      const reason = String(data?.reason || "").toUpperCase()
      if (reason === "ROLE_NOT_ALLOWED") {
        alert("Seu usuário não tem permissão para registrar encomendas. Entre como administrador/porteiro/síndico.")
      } else {
        alert("Sessão inválida ou expirada. Faça login novamente.")
      }
      try { localStorage.removeItem("token") } catch {}
      router.replace("/")
      return
    }
    if (!res.ok) {
      if (data?.error === "AMBIGUOUS_APARTMENT" && Array.isArray(data?.residents)) {
        alert(`Apto com múltiplos moradores. Informe o destinatário exato.\nOpções: ${data.residents.join(", ")}`)
      } else if (data?.error === "NO_USER_FOR_APARTMENT") {
        alert("Não há morador vinculado a este apartamento. Cadastre o morador primeiro.")
      } else if (data?.error === "APARTAMENTO_NOT_FOUND") {
        alert("Apartamento não encontrado. Verifique bloco e número (use 2 dígitos: 01, 02, ...).")
      } else {
        alert(data?.error || "Falha ao registrar")
      }
      return
    }

    // sucesso: mostrar alerta de confirmação
    const recPor = String(data?.recebido_por || recebido_por)
    setLastRecebidoPor(recPor)
    setShowAlert(true)
    // opcional: rolar para o topo para o usuário ver o alerta
    containerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" })

    // limpar formulário
    setBloco("")
    setApartamento("")
    setMorador("")
    setEmpresa("")
    setEmpresaIsOutro(false)

    // esconder alerta após alguns segundos
    setTimeout(() => setShowAlert(false), 3500)
  }

  return (
    <>
      <AdminGate />
      <div className="container" ref={containerRef}>
        <div className="main-content">

          {/* Top bar com saudação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName)}` : " Administrador"}!
            </span>
          </div>

          <div className="header">
            <h1>Registrar Encomenda</h1>
            <p>Preencha os dados da encomenda recebida</p>
          </div>

          {showAlert && (
            <div className="alert success">
              ✅ Encomenda registrada com sucesso!
              <br />
              O morador será notificado.
              <br />
              <small>Recebido por {lastRecebidoPor}</small>
            </div>
          )}

          <div className="card">
            <form onSubmit={handleRegistrar}>
              {/* Bloco */}
              <div className="form-group">
                <label className="form-label">Bloco</label>
                <select name="bloco" className="form-select" value={bloco} onChange={(e) => setBloco(e.target.value)} required>
                  <option value="">Selecione o bloco</option>
                  {blocos.map((b) => (
                    <option key={b} value={b}>
                      Bloco {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apartamento */}
              <div className="form-group">
                <label className="form-label">Apartamento</label>
                <select
                  name="apartamento"
                  className="form-select"
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                  required
                >
                  <option value="">Selecione o apartamento</option>
                  {apartamentos.map((apt) => (
                    <option key={apt} value={apt}>
                      Apt {apt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Morador */}
              <div className="form-group">
                <label className="form-label">Destinatário</label>
                <input
                  name="nome"
                  type="text"
                  className="form-input"
                  value={morador}
                  onChange={(e) => setMorador(capFirst(e.target.value))}
                  placeholder="Ex.: Maria Silva"
                />
              </div>

              {/* Empresa de Entrega */}
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select
                  name="empresa_entrega"
                  className="form-select"
                  value={empresaIsOutro ? "Outra empresa" : empresa}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "Outra empresa") {
                      setEmpresaIsOutro(true)
                      setEmpresa("") // passa a digitar no input abaixo
                    } else {
                      setEmpresaIsOutro(false)
                      setEmpresa(v)
                    }
                  }}
                  required
                >
                  <option value="">Selecione a empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo aparece só quando selecionar "Outros" */}
              {empresaIsOutro && (
                <div className="form-group">
                  <label className="form-label">Outra empresa</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa}
                    onChange={(e) => setEmpresa(capFirst(e.target.value))}
                    placeholder="Digite o nome da empresa"
                    required
                  />
                </div>
              )}

              {/* Recebido por é determinado automaticamente pelo usuário logado */}

              <div style={{ display: "flex", justifyContent: "center", marginTop: "0.75rem" }}>
                <button type="submit" className="btn btn-primary">
                  Registrar Encomenda
                </button>
              </div>
            </form>
          </div>
        </div>

        <nav
          id="registrar-nav"
          className="nav-menu nav-modern"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: navDims.width,
          }}
        >
          <Link href="/historico" className="nav-item" title="Histórico">
            <History className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Histórico</span>
          </Link>

          {isAdmEmail && (
            <Link href="/moradores" className="nav-item" title="Moradores">
              <UserRound className="nav-icon-svg" aria-hidden="true" />
              <span className="nav-label">Moradores</span>
            </Link>
          )}

          <Link href="/aviso" className="nav-item" title="Aviso">
            <AlertTriangle className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Aviso</span>
          </Link>

          <button
            type="button"
            className="nav-item"
            onClick={logout}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Sair</span>
          </button>
        </nav>
      </div>

      <style jsx>{`
        /* base */
        .nav-menu { position: fixed; bottom: 0; z-index: 1000; padding-bottom: calc(env(safe-area-inset-bottom, 0px)); }
        .container { padding-bottom: 80px; }

        /* moderna com azul discreto */
        #registrar-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #registrar-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 10px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #registrar-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #registrar-nav .nav-item:active { transform: translateY(1px); }
        #registrar-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #registrar-nav .nav-icon-svg { width: 18px; height: 18px; }
        #registrar-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }
      `}</style>
    </>
  )
}


