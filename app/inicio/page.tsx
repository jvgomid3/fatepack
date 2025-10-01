"use client"

import React, { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Mail, UserRound, ClipboardList, Home, Package, LogOut } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function InicioPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [userType, setUserType] = useState<string>("")
  const [userBlock, setUserBlock] = useState<string>("")
  const [userApartment, setUserApartment] = useState<string>("")
  const [userPhone, setUserPhone] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [moradores, setMoradores] = useState<Array<{ nome: string; telefone?: string; tipo?: string }>>([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  // data exemplo para aviso do condomínio (3 dias à frente)
  const energyAlertDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    try { return d.toLocaleDateString("pt-BR") } catch { return d.toDateString() }
  })()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState({ left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)

  // logout copiado da /encomendas: limpa storage e faz replace + redirect
  const logout = () => {
    try {
      localStorage.removeItem("userType")
      localStorage.removeItem("userName")
      localStorage.removeItem("userBlock")
      localStorage.removeItem("userApartment")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      localStorage.removeItem("displayName")
    } catch {}
    router.replace("/")
  // removido reload para evitar flash de layout antigo
  }

  // prioriza ?nome na URL; se não existir, usa localStorage (fluxo de login)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const q = new URLSearchParams(window.location.search).get("nome")
        if (q) {
          setUserName(q)
          localStorage.setItem("userName", q)
        } else {
          const s = localStorage.getItem("userName")
          if (s) setUserName(s)
        }

        // demais dados do usuário para a seção "Seus Dados"
        setUserType(localStorage.getItem("userType") || "")
        setUserBlock(localStorage.getItem("userBlock") || "")
        setUserApartment(localStorage.getItem("userApartment") || "")
        // telefone pode não existir no storage (depende do fluxo de login)
        const storedPhone = localStorage.getItem("userPhone") || localStorage.getItem("telefone") || ""
        setUserPhone(storedPhone)
  setUserEmail(localStorage.getItem("userEmail") || "")

        // tenta buscar o nome atualizado no banco a partir do email salvo
        const email = localStorage.getItem("userEmail") || ""
        const fallbackName = localStorage.getItem("userName") || ""
        if (email || fallbackName) {
          const qs = email
            ? `email=${encodeURIComponent(email)}`
            : `nome=${encodeURIComponent(fallbackName)}`
          fetch(`/api/usuario?${qs}`)
            .then((r) => r.ok ? r.json() : null)
            .then((j) => {
              if (j?.nome) {
                setUserName(j.nome)
                try { localStorage.setItem("userName", j.nome) } catch {}
              }
              if (j?.email) {
                setUserEmail(j.email)
                try { localStorage.setItem("userEmail", j.email) } catch {}
              }
            })
            .catch(() => {})
        }
      }
    } catch {
      /* ignore */
    }
  }, [searchParams])

  // medição do container para nav (mantém comportamento antigo)
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setNavDims({ left: r.left, width: r.width })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  useEffect(() => { setMounted(true) }, [])

  // carrega contagem de encomendas pendentes (não retiradas)
  useEffect(() => {
    const loadPending = async () => {
      try {
        const token = localStorage.getItem("token") || ""
        if (!token) { setPendingCount(0); return }
        const res = await fetch(`/api/encomendas?ts=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(data)) { setPendingCount(0); return }
        // API retorna retirado_por e/ou data_retirada quando entregue
        const pending = data.filter((e: any) => !(e?.retirado_por || e?.data_retirada))
        setPendingCount(pending.length)
      } catch {
        setPendingCount(0)
      }
    }
    loadPending()
    const id = setInterval(loadPending, 30000)
    return () => clearInterval(id)
  }, [])

  // carrega moradores do mesmo bloco/apto
  useEffect(() => {
    const loadMoradores = async () => {
      if (!userBlock || !userApartment) {
        setMoradores([])
        return
      }
      try {
        const res = await fetch(`/api/moradores?bloco=${encodeURIComponent(userBlock)}&apto=${encodeURIComponent(userApartment)}`)
        const j = await res.json().catch(() => null)
        if (res.ok && j?.moradores) setMoradores(j.moradores)
        else setMoradores([])
      } catch {
        setMoradores([])
      }
    }
    loadMoradores()
  }, [userBlock, userApartment])

  // mascara de telefone BR
  const formatPhoneBR = (input: string): string => {
    const d = String(input || "").replace(/\D/g, "")
    if (!d) return ""
    if (d.length >= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }

  return (
    <>
      {/* Badge fixo removido a pedido: não exibir "Área do Morador" nesta página */}

      <div className="container" ref={containerRef}>
        {/* título superior à direita, no mesmo lugar da saudação de /encomendas */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontFamily: "inherit", fontWeight: 700, color: "var(--primary, #06b6d4)" }}>Página Inicial</span>
        </div>

        <div className="header" style={{ position: "relative", marginTop: 42 }}>
          <h1>Olá, {userName ? String(userName).split(" ")[0] : "Usuário"}!</h1>
          <p>Bem-vindo ao FatePack!</p>
        </div>

        <div className="main-content">
          <div className="card dados-card" style={{ paddingBottom: 16 }}>
            {/* Seção "Seus Dados" */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <ClipboardList className="section-icon" aria-hidden="true" />
              <h2 className="section-title dados-title" style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>Meus Dados</h2>
            </div>

            <div className="dados-grid">
              {/* Apartamento */}
              <div className="dados-item">
                <div className="dados-icon" style={{ background: "#e0ecff" }} aria-hidden="true">📍</div>
                <div className="dados-meta">
                  <div className="dados-label">Apartamento</div>
                  <div className="dados-value">
                    {userBlock || userApartment
                      ? `Bloco ${userBlock || "-"} - Apto ${userApartment || "-"}`
                      : "Não informado"}
                  </div>
                </div>
              </div>

              {/* Telefone */}
              <div className="dados-item">
                <div className="dados-icon" style={{ background: "#d7f5e6" }} aria-hidden="true">📞</div>
                <div className="dados-meta">
                  <div className="dados-label">Telefone</div>
                  <div className="dados-value">{userPhone ? formatPhoneBR(userPhone) : "Não informado"}</div>
                </div>
              </div>

              {/* E-mail */}
              <div className="dados-item">
                <div className="dados-icon" style={{ background: "#e9f0ff" }} aria-hidden="true">
                  <Mail className="mail-icon" />
                </div>
                <div className="dados-meta">
                  <div className="dados-label">E-mail</div>
                  <div className="dados-value">{userEmail || "Não informado"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Moradores do Apartamento */}
          <div className="card moradores-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span aria-hidden="true" style={{ fontSize: 18 }}>👥</span>
              <h2 className="section-title moradores-title" style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>Moradores do Apartamento</h2>
            </div>
            <div style={{ color: "var(--muted-foreground)", marginBottom: 12 }}>Pessoas cadastradas neste apartamento</div>

            <div className="moradores-list">
              {moradores?.length ? (
                moradores.map((m, idx) => (
                  <div className="morador-item" key={`${m.nome}-${idx}`}>
                    <div className="morador-avatar" aria-hidden="true">
                      <UserRound className="morador-user-icon" />
                    </div>
                    <div className="morador-text">
                      <div className="morador-nome">{m.nome}</div>
                      <div className="morador-phone">{m.telefone ? formatPhoneBR(m.telefone) : "Sem telefone"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted-foreground)" }}>Nenhum morador encontrado para este apartamento.</div>
              )}
            </div>
          </div>

          {/* Alertas e notificações (card separado, abaixo dos moradores) */}
          <div className="card alertas-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span aria-hidden="true" style={{ fontSize: 18 }}>🔔</span>
              <h2 className="section-title alertas-title" style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>Alertas e Notificações</h2>
            </div>
            <div className="alerts-list">
              <div className="alert-item">
                <div className="alert-icon" style={{ background: "#fff0d6" }} aria-hidden="true">⚠️</div>
                <div className="alert-main">
                  <div className="alert-title">Aviso do condomínio</div>
                  <div className="alert-desc">Informamos que no dia {energyAlertDate} ficaremos sem energia no condomínio.</div>
                </div>
              </div>

              {pendingCount > 0 && (
                <div className="alert-item new-package" style={{ position: "relative" }} onClick={() => router.push("/encomendas")}>
                  <div className="alert-icon" style={{ background: "#e0ecff" }} aria-hidden="true">📦</div>
                  <div className="alert-main">
                    <div className="alert-title">Nova encomenda</div>
                    <div className="alert-desc">Você tem uma nova encomenda para ser retirada.</div>
                  </div>
                  <span className="alert-count-badge" aria-label={`${pendingCount} encomenda(s) pendente(s)`}>{pendingCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Espaço para não sobrepor o fim dos cards pelo nav fixo */}
        {userName && (<div style={{ height: 96 }} aria-hidden="true" />)}

        {/* Nav inferior: mostra apenas quando o usuário estiver logado */}
        {userName && (
          <nav
            id="inicio-nav"
            className="nav-menu nav-modern"
            role="navigation"
            aria-label="Menu inferior"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              width: navDims.width
                ? `${navDims.width}px`
                : "min(720px, calc(100% - 32px))",
            }}
          >
            <Link href="/inicio" className="nav-item" title="Perfil">
              <UserRound className="nav-icon-svg" aria-hidden="true" />
              <span className="nav-label">Perfil</span>
            </Link>
            <Link href="/encomendas" className="nav-item" title="Encomendas">
              <Package className="nav-icon-svg" aria-hidden="true" />
              <span className="nav-label">Encomendas</span>
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
        )}
       </div>

      <style jsx>{`
         .user-greeting {
           position: fixed !important;
           top: 10px !important;
           right: 12px !important;
           color: var(--primary, #06b6d4);
           font-weight: 700;
           font-size: 14px;
           padding: 6px 8px;
           z-index: 2000; /* acima da bottom-nav e cards */
         }
         @media (max-width: 520px) {
           .user-greeting { top: 8px !important; right: 10px !important; font-size: 16px; }
         }
      `}</style>

      {/* força estilos específicos para esta página (sobrescreve regras globais) */}
      <style jsx>{`
        #inicio-nav {
          position: fixed !important;
          bottom: 0px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: ${navDims.width ? `${navDims.width}px` : "min(720px, calc(100% - 32px))"} !important;
          z-index: 1000 !important;
        }
        /* Nav moderna (glassmorphism) */
        #inicio-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #inicio-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 10px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
  #inicio-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #inicio-nav .nav-item:active { transform: translateY(1px); }
        #inicio-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #inicio-nav .nav-icon-svg { width: 18px; height: 18px; }
        #inicio-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }

        /* grade dos dados do usuário */
        .dados-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
        }
        @media (max-width: 860px) {
          .dados-grid { grid-template-columns: 1fr; }
        }
        .dados-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 4px;
        }
        .dados-icon {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .mail-icon { width: 20px; height: 20px; color: var(--foreground, #0f172a); }
        .dados-meta { display: flex; flex-direction: column; gap: 2px; }
        .dados-label { color: var(--muted-foreground); font-size: 13px; }
        .dados-value { font-weight: 700; color: var(--foreground, #0f172a); }
        /* removido perfil-pill (substituído por E-mail) */

        /* lista de moradores */
        .moradores-list { display: flex; flex-direction: column; gap: 10px; }
        .morador-item {
          display: flex; align-items: center; gap: 12px;
          background: #f7f9fc; border-radius: 12px; padding: 12px 14px;
        }
        .morador-avatar {
          width: 36px; height: 36px; border-radius: 9999px;
          background: #eef2ff; display: inline-flex; align-items: center; justify-content: center;
        }
        .morador-user-icon { width: 18px; height: 18px; color: #6366f1; }
        .morador-text { display: flex; flex-direction: column; gap: 2px; }
        .morador-nome { font-weight: 700; color: var(--foreground, #0f172a); }
        .morador-phone { color: #64748b; font-size: 14px; }

        /* alertas */
        .alerts-list { display: flex; flex-direction: column; gap: 12px; }
        .alert-item {
          display: flex; align-items: center; gap: 12px;
          background: #f7f9fc; border-radius: 12px; padding: 14px 16px;
        }
        .alert-item.new-package .alert-count-badge {
          position: absolute;
          top: 8px;
          right: 10px;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 9999px;
          background: #ef4444; /* vermelho para destaque */
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
        }
        .alert-icon {
          width: 40px; height: 40px; border-radius: 9999px;
          display: inline-flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .alert-main { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .alert-title { font-weight: 700; color: var(--foreground, #0f172a); }
        .alert-desc { color: #475569; }
        .section-icon { width: 18px; height: 18px; color: var(--primary, #06b6d4); }

        /* cards coloridos e títulos com destaque */
        .card { border: 1px solid rgba(2, 6, 23, 0.05); }
        .dados-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #ecfeff 35%, #ffffff 100%);
        }
        .moradores-card {
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 35%, #ffffff 100%);
        }
        .alertas-card {
          background: linear-gradient(135deg, #fff7ed 0%, #fffbeb 35%, #ffffff 100%);
        }
        .section-title { letter-spacing: -0.2px; }
        .dados-title { color: #0ea5e9; }
        .moradores-title { color: #6366f1; }
        .alertas-title { color: #f59e0b; }

        /* ajustar cores internas para combinar com os temas dos cards */
        .dados-icon[aria-hidden="true"] { color: #0f172a; }
        .morador-item { background: rgba(99, 102, 241, 0.08); }
        .alert-item { background: rgba(245, 158, 11, 0.08); }
      `}</style>
    </>
  )
}