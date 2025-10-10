"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { History, LogOut, Package, UserRound } from "lucide-react"
import AdminGate from "../components/AdminGate"
import { useRouter } from "next/navigation"

// helper: capitaliza a primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

// formata "YYYY-MM-DD HH:mm[:ss]" ou ISO em "DD/MM/YYYY HH:mm"
function formatDateTimeBR(value?: string) {
  if (!value) return "-"
  const s = String(value).replace(" ", "T")
  const d = new Date(s)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AvisoPage() {
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
  // removido reload para evitar flash de layout antigo
  }

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmEmail, setIsAdmEmail] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [expiraEm, setExpiraEm] = useState<string>("")
  const [enviando, setEnviando] = useState(false)
  const [avisosAtivos, setAvisosAtivos] = useState<Array<{ id_aviso: number; titulo: string; mensagem: string; inicio: string; fim: string }>>([])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editTitulo, setEditTitulo] = useState("")
  const [editMensagem, setEditMensagem] = useState("")
  const [editFim, setEditFim] = useState("")
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const displayName =
    (currentUser && (currentUser.name || currentUser.nome)) ||
    (typeof window !== "undefined" ? localStorage.getItem("userName") : null) ||
    "Administrador"

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
    setCurrentUser(user)
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "")
      .trim()
      .toLowerCase()
    setIsAdmEmail(email === "adm")
  }, [])

  // carrega avisos ativos periodicamente
  useEffect(() => {
    const loadAvisos = async () => {
      try {
        const res = await fetch(`/api/aviso?active=all&ts=${Date.now()}`, { cache: "no-store" })
        const j = await res.json().catch(() => null)
        if (res.ok && Array.isArray(j?.avisos)) setAvisosAtivos(j.avisos)
        else setAvisosAtivos([])
      } catch {
        setAvisosAtivos([])
      }
    }
    loadAvisos()
    const id = setInterval(loadAvisos, 60000)
    return () => clearInterval(id)
  }, [])

  async function handleEnviarAviso() {
    if (!titulo.trim() || !mensagem.trim() || !expiraEm.trim()) {
      alert("Preencha Título, Mensagem e Data de Expiração.")
      return
    }
    try {
      setEnviando(true)
      const res = await fetch("/api/aviso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, mensagem, fim: expiraEm }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert(data?.error || "Falha ao enviar aviso")
        return
      }
      // se o aviso criado ainda estiver no intervalo (inicio<=agora<=fim), adiciona ao topo
      if (data?.aviso) {
        const now = new Date()
        const parse = (v: string) => {
          const s = String(v || "").replace(" ", "T")
          const d = new Date(s)
          return isNaN(d.getTime()) ? null : d
        }
        const ini = parse(data.aviso.inicio)
        const end = parse(data.aviso.fim)
        if (ini && end && ini <= now && now <= end) {
          setAvisosAtivos((prev) => {
            const exists = prev.find((a) => a.id_aviso === data.aviso.id_aviso)
            return exists ? prev : [data.aviso, ...prev]
          })
        }
      }
      setTitulo("")
      setMensagem("")
      setExpiraEm("")
    } catch {
      alert("Falha ao enviar aviso")
    } finally {
      setEnviando(false)
    }
  }

  function abrirEdicao(a: { id_aviso: number; titulo: string; mensagem: string; fim: string }) {
    setEditandoId(a.id_aviso)
    setEditTitulo(a.titulo)
    setEditMensagem(a.mensagem)
    // converter fim "YYYY-MM-DD HH:mm[:ss]" para "YYYY-MM-DDTHH:mm"
    const fimIso = String(a.fim || "").replace(" ", "T")
    const d = new Date(fimIso)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const hh = String(d.getHours()).padStart(2, "0")
      const mi = String(d.getMinutes()).padStart(2, "0")
      setEditFim(`${yyyy}-${mm}-${dd}T${hh}:${mi}`)
    } else {
      setEditFim("")
    }
  }

  async function salvarEdicao() {
    if (!editandoId) return
    if (!editTitulo.trim() || !editMensagem.trim() || !editFim.trim()) {
      alert("Preencha Título, Mensagem e Data de Expiração.")
      return
    }
    try {
      setSalvandoEdicao(true)
      const res = await fetch("/api/aviso", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_aviso: editandoId, titulo: editTitulo, mensagem: editMensagem, fim: editFim }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) {
        alert(j?.error || "Falha ao salvar edição")
        return
      }
      // se ainda estiver ativo, atualiza na lista; se não, remove da lista
      setAvisosAtivos((prev) => {
        const now = new Date()
        const parse = (v: string) => {
          const s = String(v || "").replace(" ", "T")
          const d = new Date(s)
          return isNaN(d.getTime()) ? null : d
        }
        const ini = parse(j.aviso.inicio)
        const end = parse(j.aviso.fim)
        if (ini && end && ini <= now && now <= end) {
          return prev.map((a) => (a.id_aviso === j.aviso.id_aviso ? j.aviso : a))
        }
        return prev.filter((a) => a.id_aviso !== j.aviso.id_aviso)
      })
      setEditandoId(null)
    } catch {
      alert("Falha ao salvar edição")
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function removerAviso(id_aviso: number) {
    try {
      const res = await fetch("/api/aviso", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_aviso, action: "deactivate" }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) {
        alert(j?.error || "Falha ao remover aviso")
        return
      }
      setAvisosAtivos((prev) => prev.filter((a) => a.id_aviso !== id_aviso))
      if (editandoId === id_aviso) setEditandoId(null)
    } catch {
      alert("Falha ao remover aviso")
    }
  }

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

  return (
    <>
      <AdminGate />
      <div className="container" ref={containerRef}>
        <div className="main-content">
          {/* Top bar com saudação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>←] Sair</Link>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName)}` : " Administrador"}!
            </span>
          </div>

          <div className="header">
            <h1>Aviso do Condomínio</h1>
            <p>Envie comunicados para os moradores</p>
          </div>

          <div className="card">
            {/* Conteúdo do aviso - placeholder por enquanto */}
            <div className="form-group">
              <label className="form-label">Título do Aviso</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex.: Manutenção no elevador"
                value={titulo}
                onChange={(e) => setTitulo(capFirst(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mensagem</label>
              <textarea
                className="form-input"
                placeholder="Digite o conteúdo do aviso"
                rows={5}
                value={mensagem}
                onChange={(e) => setMensagem(capFirst(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Expiração</label>
              <input
                type="datetime-local"
                name="expira_em"
                className="form-input"
                value={expiraEm}
                onChange={(e) => setExpiraEm(e.target.value)}
                placeholder="Informe a data e hora que o aviso deve expirar"
              />
              <small className="form-hint" style={{ display: "block", textAlign: "center", marginTop: 6 }}>
                Informe a data e hora que o aviso deve expirar
              </small>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "0.75rem" }}>
              <button type="button" className="btn btn-primary" onClick={handleEnviarAviso} disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar Aviso"}
              </button>
            </div>
          </div>

          {avisosAtivos.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span aria-hidden="true" style={{ fontSize: 18 }}>🔔</span>
                <h2 style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>Avisos ativos</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {avisosAtivos.map((a) => (
                  <div key={a.id_aviso} className="alert-item" style={{ background: "rgba(245, 158, 11, 0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div className="alert-icon" style={{ width: 40, height: 40, borderRadius: 9999, background: "#fff0d6", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">⚠️</div>
                      <div className="alert-main" style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        {editandoId === a.id_aviso ? (
                          <>
                            <input
                              type="text"
                              className="form-input"
                              value={editTitulo}
                              onChange={(e) => setEditTitulo(capFirst(e.target.value))}
                              placeholder="Título"
                            />
                            <textarea
                              className="form-input"
                              rows={4}
                              value={editMensagem}
                              onChange={(e) => setEditMensagem(capFirst(e.target.value))}
                              placeholder="Mensagem"
                            />
                            <input
                              type="datetime-local"
                              className="form-input"
                              value={editFim}
                              onChange={(e) => setEditFim(e.target.value)}
                            />
                          </>
                        ) : (
                          <>
                            <div className="alert-title" style={{ fontWeight: 700 }}>{a.titulo}</div>
                            <div className="alert-desc" style={{ color: "#475569" }}>{a.mensagem}</div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>Expira em: {formatDateTimeBR(a.fim)}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {editandoId === a.id_aviso ? (
                        <>
                          <button className="btn btn-primary" onClick={salvarEdicao} disabled={salvandoEdicao}>
                            {salvandoEdicao ? "Salvando..." : "Salvar"}
                          </button>
                          <button className="btn btn-outline" onClick={() => setEditandoId(null)}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-primary" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => abrirEdicao(a)}>Editar</button>
                          <button className="btn btn-danger" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => removerAviso(a.id_aviso)}>Remover</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav
          id="aviso-nav"
          className="nav-menu nav-modern"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: navDims.width,
          }}
        >
          <Link href="/registrar" className="nav-item" title="Registrar">
            <span className="nav-icon" aria-hidden="true">📦</span>
            <span className="nav-label">Registrar</span>
          </Link>

          <Link href="/historico" className="nav-item" title="Histórico">
            <span className="nav-icon" aria-hidden="true">🕒</span>
            <span className="nav-label">Histórico</span>
          </Link>

          {isAdmEmail && (
            <Link href="/moradores" className="nav-item" title="Moradores">
              <span className="nav-icon" aria-hidden="true">👤</span>
              <span className="nav-label">Moradores</span>
            </Link>
          )}

          <button
            type="button"
            className="nav-item"
            onClick={logout}
            aria-label="Sair"
            title="Sair"
          >
            <span className="nav-icon" aria-hidden="true">↩️</span>
            <span className="nav-label">Sair</span>
          </button>
        </nav>
      </div>

      <style jsx>{`
        /* base */
        .nav-menu { position: fixed; bottom: 0; z-index: 1000; padding-bottom: calc(env(safe-area-inset-bottom, 0px)); }
        .container { padding-bottom: 80px; }

        /* moderna com azul discreto */
        #aviso-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #aviso-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 4px; padding: 7px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #aviso-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #aviso-nav .nav-item:active { transform: translateY(1px); }
        #aviso-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #aviso-nav .nav-icon-svg { width: 18px; height: 18px; }
        #aviso-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }

        /* botão remover: vermelho */
        :global(.btn-danger) {
          background-color: #ef4444;
          border: 1px solid #dc2626;
          color: #fff;
          font-weight: 700;
        }
        :global(.btn-danger:hover) { filter: brightness(1.03); }
        :global(.btn-danger:disabled) { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </>
  )
}
