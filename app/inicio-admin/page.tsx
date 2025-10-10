"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { History, Package, UserRound, AlertTriangle } from "lucide-react"
import AdminGate from "../components/AdminGate"
import { useRouter } from "next/navigation"

export default function InicioAdminPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdmEmail, setIsAdmEmail] = useState(false)
  const [displayName, setDisplayName] = useState<string>("")

  const containerRef = useRef<HTMLDivElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    try {
      const t = (localStorage.getItem("userType") || "").toLowerCase()
      const admin = t === "admin"
      setIsAdmin(admin)
      if (!admin) {
        router.replace("/")
        return
      }
      const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "")
        .trim()
        .toLowerCase()
      setIsAdmEmail(email === "adm")
      const name =
        localStorage.getItem("userName") ||
        (JSON.parse(localStorage.getItem("currentUser") || "{}")?.name || "")
      setDisplayName(String(name || "Administrador"))
    } catch {
      router.replace("/")
    }
  }, [router])

  // logout simples: limpa storage e volta para a tela inicial
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
      localStorage.removeItem("userEmail")
      localStorage.removeItem("telefone")
    } catch {}
    router.replace("/")
  }

  if (!hydrated) return null
  if (!isAdmin) return null

  return (
    <>
      <AdminGate />
      <div className="container" ref={containerRef}>
        <div className="main-content">
          {/* Top bar com ←] Sair à esquerda e "Página Inicial" à direita (igual à /inicio) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <button
              type="button"
              className="back-link"
              onClick={logout}
              aria-label="Sair"
              title="Sair"
            >
              ←] Sair
            </button>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700, color: "var(--primary, #06b6d4)" }}>
              Página Inicial
            </span>
          </div>

          <div className="header" style={{ marginBottom: "1rem" }}>
            <h1>Olá{displayName ? `, ${displayName}` : " Administrador"}!</h1>
            <p>Painel do administrador</p>
          </div>

          {/* Links principais, cada um em seu card colorido */}
          <div className="cards-grid">
            <Link
              href="/historico"
              className="card card-historico"
              title="Histórico de Encomendas"
              style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 60%, #86efac 100%)" }}
            >
              <div className="card-inner">
                <History className="card-icon" aria-hidden="true" />
                <div className="card-title">Histórico de Encomendas</div>
                <div className="card-desc">Visualize todas as encomendas registradas</div>
              </div>
            </Link>

            <Link
              href="/registrar"
              className="card card-registrar"
              title="Registrar Encomenda"
              style={{ background: "linear-gradient(135deg, #eff6ff 0%, #bfdbfe 60%, #93c5fd 100%)" }}
            >
              <div className="card-inner">
                <Package className="card-icon" aria-hidden="true" />
                <div className="card-title">Registrar Encomenda</div>
                <div className="card-desc">Cadastre novas encomendas recebidas</div>
              </div>
            </Link>

            {isAdmEmail && (
              <Link
                href="/moradores"
                className="card card-moradores"
                title="Gestão de Moradores"
                style={{ background: "linear-gradient(135deg, #faf5ff 0%, #e9d5ff 60%, #d8b4fe 100%)" }}
              >
                <div className="card-inner">
                  <span className="card-icon" aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>👤</span>
                  <div className="card-title">Gestão de Moradores</div>
                  <div className="card-desc">Crie, edite e gerencie moradores</div>
                </div>
              </Link>
            )}

            <Link
              href="/aviso"
              className="card card-aviso"
              title="Aviso"
              style={{ background: "linear-gradient(135deg, #fefce8 0%, #fde68a 60%, #fde047 100%)" }}
            >
              <div className="card-inner">
                <AlertTriangle className="card-icon" aria-hidden="true" />
                <div className="card-title">Aviso</div>
                <div className="card-desc">Envie comunicados para os moradores</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* estilo do link de sair */
        .back-link {
          background: transparent;
          border: 0;
          padding: 0;
          color: var(--primary, #06b6d4);
          font-weight: 700;
          cursor: pointer;
        }
        /* Grid com margens e espaçamento similares à /inicio */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 6px;
          margin-top: 8px;
        }
        /* garantir que nenhum margin extra dos filhos aumente o espaçamento */
        .cards-grid :global(a.card) { margin: 0 !important; }
        .card {
          border-radius: 12px;
          border: 1px solid rgba(2, 6, 23, 0.05);
          background: #ffffff;
          text-decoration: none;
          color: inherit;
          transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.3s ease;
          box-shadow: 0 2px 8px rgba(2, 6, 23, 0.04);
        }
        .card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(2, 6, 23, 0.10); }
        .card:active { transform: translateY(0); }
        .card-inner {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 18px 16px;
          gap: 8px;
        }
        .card-icon { width: 22px; height: 22px; }
        .card-title { font-weight: 800; letter-spacing: -0.2px; }
  .card-desc { color: var(--muted-foreground); font-size: 14px; font-weight: 700; }

        /* Paletas coloridas (no estilo dos cards da /inicio) */
        .card-historico { background: linear-gradient(135deg, #f0f9ff 0%, #ecfeff 35%, #ffffff 100%); }
        .card-registrar { background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 35%, #ffffff 100%); }
        .card-moradores { background: linear-gradient(135deg, #f7f9fc 0%, #e6f6ff 35%, #ffffff 100%); }
        .card-aviso { background: linear-gradient(135deg, #fff7ed 0%, #fffbeb 35%, #ffffff 100%); }

  /* Cores por tema: ícone, título, borda e hover */
  .card-historico { border-color: rgba(22, 163, 74, 0.18); }
  .card-historico .card-icon, .card-historico .card-title { color: #16a34a; }
  .card-historico:hover { box-shadow: 0 8px 24px rgba(22, 163, 74, 0.18); }

  .card-registrar { border-color: rgba(37, 99, 235, 0.18); }
  .card-registrar .card-icon, .card-registrar .card-title { color: #2563eb; }
  .card-registrar:hover { box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18); }

  .card-moradores { border-color: rgba(124, 58, 237, 0.18); }
  .card-moradores .card-icon, .card-moradores .card-title { color: #7c3aed; }
  .card-moradores:hover { box-shadow: 0 8px 24px rgba(124, 58, 237, 0.18); }

  .card-aviso { border-color: rgba(234, 179, 8, 0.22); }
  .card-aviso .card-icon, .card-aviso .card-title { color: #eab308; }
  .card-aviso:hover { box-shadow: 0 8px 24px rgba(234, 179, 8, 0.20); }
      `}</style>
    </>
  )
}
