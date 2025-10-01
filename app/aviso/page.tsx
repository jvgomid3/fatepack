"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { History, LogOut, Package, UserRound } from "lucide-react"
import AdminGate from "../components/AdminGate"
import { useRouter } from "next/navigation"

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
  const [expiraEm, setExpiraEm] = useState<string>("")
  const displayName =
    (currentUser && (currentUser.name || currentUser.nome)) ||
    (typeof window !== "undefined" ? localStorage.getItem("userName") : null) ||
    "Administrador"

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
    setCurrentUser(user)
  }, [])

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
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
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
              <input type="text" className="form-input" placeholder="Ex.: Manutenção no elevador" />
            </div>
            <div className="form-group">
              <label className="form-label">Mensagem</label>
              <textarea className="form-input" placeholder="Digite o conteúdo do aviso" rows={5} />
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
              <button type="button" className="btn btn-primary" disabled>
                Enviar Aviso (em breve)
              </button>
            </div>
          </div>
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
            <Package className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Registrar</span>
          </Link>

          <Link href="/historico" className="nav-item" title="Histórico">
            <History className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Histórico</span>
          </Link>

          <Link href="/moradores" className="nav-item" title="Moradores">
            <UserRound className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Moradores</span>
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
        #aviso-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #aviso-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 10px 14px; margin: 6px 8px; border-radius: 12px;
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
      `}</style>
    </>
  )
}
