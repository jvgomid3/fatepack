"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { History, LogOut, Package, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

type Morador = {
  nome: string
  email: string
  telefone?: string
  tipo?: string
  bloco?: string
  apartamento?: string
}

export default function MoradoresPage() {
  const router = useRouter()

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
  }

  // Gate por e-mail (não por tipo). Só deixa entrar se email === "adm" ou "admin"
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [emailUser, setEmailUser] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("Administrador")

  useEffect(() => {
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim().toLowerCase()
    const current = JSON.parse(localStorage.getItem("currentUser") || "{}")
    const name = current?.name || current?.nome || localStorage.getItem("userName") || "Administrador"
    setDisplayName(String(name))
    setEmailUser(email)
    if (email === "adm" || email === "admin") {
      setAllowed(true)
    } else {
      setAllowed(false)
      router.replace("/")
    }
  }, [router])

  // UI state
  const containerRef = useRef<HTMLDivElement | null>(null)
  const backLinkRef = useRef<HTMLAnchorElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    // força cor azul primária para a saudação
    if (helloRef.current) {
      helloRef.current.style.color = "var(--primary, #06b6d4)"
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

  // CRUD state
  const [searchEmail, setSearchEmail] = useState("")
  const [searchNome, setSearchNome] = useState("")
  const [result, setResult] = useState<Morador | null>(null)
  const [msg, setMsg] = useState<string>("")

  const [form, setForm] = useState<Morador>({ nome: "", email: "", telefone: "", tipo: "", bloco: "", apartamento: "" })

  const handleSearch = async () => {
    setMsg("")
    setResult(null)
    try {
      const qs = searchEmail
        ? `email=${encodeURIComponent(searchEmail)}`
        : searchNome
        ? `nome=${encodeURIComponent(searchNome)}`
        : ""
      if (!qs) { setMsg("Informe e-mail ou nome para buscar."); return }
      const r = await fetch(`/api/usuario?${qs}`)
      const j = await r.json().catch(() => null)
      if (!r.ok) { setMsg(j?.error || "Não encontrado"); return }
      setResult(j as Morador)
      setForm({
        nome: String((j as any).nome || ""),
        email: String((j as any).email || ""),
        telefone: String((j as any).telefone || ""),
        tipo: String((j as any).tipo || ""),
        bloco: String((j as any).bloco || ""),
        apartamento: String((j as any).apartamento || ""),
      })
    } catch {
      setMsg("Falha ao buscar usuário.")
    }
  }

  const onCreate = async () => {
    alert("Criar usuário: implementar endpoint /api/moradores (POST)")
  }
  const onUpdate = async () => {
    alert("Atualizar usuário: implementar endpoint /api/moradores (PUT)")
  }
  const onDelete = async () => {
    if (!form.email) { alert("Informe o e-mail para deletar"); return }
    alert("Deletar usuário: implementar endpoint /api/moradores (DELETE)")
  }

  if (allowed === false) return null
  if (allowed === null) return null

  return (
    <>
      <div className="container" ref={containerRef}>
        <div className="main-content">
          {/* Top bar com saudação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
            <span ref={helloRef} className="hello-greeting" style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName)}` : " Administrador"}!
            </span>
          </div>

          <div className="header">
            <h1>Gestão de Moradores</h1>
            <p>Crie, busque, atualize e remova moradores</p>
          </div>

          {msg && (
            <div className="alert" role="status">{msg}</div>
          )}

          {/* Card de Busca */}
          <div className="card search-card">
            <div className="form-group">
              <label className="form-label">Buscar por E-mail</label>
              <input className="form-input" type="text" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="Ex.: maria@exemplo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Buscar por Nome</label>
              <input className="form-input" type="text" value={searchNome} onChange={(e) => setSearchNome(e.target.value)} placeholder="Ex.: Maria Silva" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" className="btn btn-primary" onClick={handleSearch}>Buscar</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                className="link-clear"
                onClick={() => { setSearchEmail(""); setSearchNome(""); setResult(null); setMsg(""); }}
                aria-label="Limpar campos de busca"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Card de Edição/Criação */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" type="tel" value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={form.tipo || ""}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="">Selecione o tipo</option>
                <option value="morador">morador</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bloco</label>
              <input className="form-input" type="text" value={form.bloco || ""} onChange={(e) => setForm({ ...form, bloco: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Apartamento</label>
              <input className="form-input" type="text" value={form.apartamento || ""} onChange={(e) => setForm({ ...form, apartamento: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-crud btn-criar"
                onClick={onCreate}
                style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
              >
                Criar
              </button>
              <button
                type="button"
                className="btn btn-crud btn-atualizar"
                onClick={onUpdate}
                style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
              >
                Atualizar
              </button>
              <button
                type="button"
                className="btn btn-crud btn-deletar"
                onClick={onDelete}
                style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
              >
                Deletar
              </button>
            </div>
          </div>
        </div>

        <nav
          id="moradores-nav"
          className="nav-menu nav-modern"
          style={{ left: 0, right: 0, transform: "none", width: "100%" }}
        >
          <Link href="/registrar" className="nav-item" title="Registrar">
            <Package className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Registrar</span>
          </Link>

          <Link href="/historico" className="nav-item" title="Histórico">
            <History className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Histórico</span>
          </Link>

          <Link href="/aviso" className="nav-item" title="Aviso">
            <AlertTriangle className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Aviso</span>
          </Link>

          <button type="button" className="nav-item" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Sair</span>
          </button>
        </nav>
      </div>

      <style jsx>{`
        /* base */
  .nav-menu { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; z-index: 1000; padding-bottom: calc(env(safe-area-inset-bottom, 0px)); }
        .container { padding-bottom: 80px; }

        /* moderna com azul discreto */
        #moradores-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #moradores-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 7px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #moradores-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #moradores-nav .nav-item:active { transform: translateY(1px); }
        #moradores-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #moradores-nav .nav-icon-svg { width: 18px; height: 18px; }
        #moradores-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }

        /* força cor azul na saudação, evitando sobrescritas */
        .hello-greeting { color: var(--primary, #06b6d4) !important; }

        /* Base dos botões CRUD */
        .btn-crud { border: none !important; color: #fff !important; border-radius: 8px; }
        /* Cores dos botões CRUD (com !important para prevalecer) */
        .btn-criar { background-color: #16a34a !important; border-color: #15803d !important; }
        .btn-atualizar  { background-color: #3b82f6 !important; border-color: #2563eb !important; }
        .btn-deletar   { background-color: #ef4444 !important; border-color: #dc2626 !important; }

        /* Link de limpar campos */
        .link-clear { background: transparent; border: none; color: #0ea5e9; cursor: pointer; font-size: 14px; padding: 0; }
        .link-clear:hover { text-decoration: underline; }

        /* Menor espaço abaixo do card de busca */
        .search-card { padding-bottom: 10px; }
      `}</style>
    </>
  )
}
