"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useMemo } from "react"
import Link from "next/link"
import AdminMenu from "../components/AdminMenu"
import { Home, LogOut } from "lucide-react"
import PullToRefresh from "../components/PullToRefresh"
import { performLogout } from "../../lib/logout"

interface Encomenda {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  dataRecebimento: string
  status: string
  isNew?: boolean
  recebidoPor?: string
  entregue?: boolean
  retiradoPor?: string
  dataRetirada?: string
}

// helper: capitaliza a primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

function formatMonthLabel(key: string) {
  const [yyyy, mm] = key.split("-")
  const monthIndex = Math.max(1, Math.min(12, parseInt(mm, 10))) - 1
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]
  const name = monthNames[monthIndex] || mm
  return `${name}/${yyyy}`
}

export default function EncomendasPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const [mesFiltro, setMesFiltro] = useState("")
  const [onlyPending, setOnlyPending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [myBlock, setMyBlock] = useState<string | null>(null)
  const [myApt, setMyApt] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [erro, setErro] = useState("")
  const backLinkRef = useRef<HTMLButtonElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null")
    const t = localStorage.getItem("userType")
    if (t === "admin") setUser({ tipo: "admin" })
    else setUser(userData)

    setMyBlock(localStorage.getItem("userBlock"))
    setMyApt(localStorage.getItem("userApartment"))

    // nome para saudação
    const name =
      localStorage.getItem("userName") ||
      userData?.nome ||
      userData?.name ||
      (userData?.email ? String(userData.email).split("@")[0] : "") ||
      "usuario"
    setDisplayName(name)

  // iguala a cor do "Olá, ..." à cor do link "←] Sair"
  const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLElement | null)
    const helloEl = helloRef.current
    if (linkEl && helloEl) {
      const cs = window.getComputedStyle(linkEl)
      helloEl.style.color = cs.color
    }

    // Carrega do banco (sem cache)
    const loadFromDB = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) { router.replace("/"); return }

        fetch(`/api/encomendas?ts=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then((data) => {
            const items: Encomenda[] = Array.isArray(data)
              ? data.map((r: any) => ({
                  id: r.id ?? r.id_encomenda,
                  bloco: r.bloco,
                  apartamento: r.apartamento,
                  morador: r.morador ?? r.nome ?? "",
                  empresa: r.empresa_entrega ?? r.empresa ?? "",
                  dataRecebimento: r.data_recebimento ?? r.dataRecebimento ?? "",
                  status: r.status ?? "",
                  recebidoPor: r.recebido_por ?? r.recebidoPor ?? "",
                  retiradoPor: r.retirado_por ?? r.nome_retirou ?? r.retiradoPor,
                  dataRetirada: r.data_retirada ?? r.dataRetirada,
                  entregue: Boolean(r.retirado_por || r.data_retirada),
                }))
              : []
            setEncomendas(items)
            setErro("")
          })
          .catch(() => { setErro("Não foi possível carregar as encomendas."); setEncomendas([]) })
      } catch (e) {
        // fallback ao localStorage se a API falhar
        const cached = JSON.parse(localStorage.getItem("encomendas") || "[]")
        setEncomendas(cached)
        setErro("Não foi possível carregar as encomendas.")
      }
    }

    loadFromDB()
  }, [router, refreshTick])

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

  const marcarComoVista = (id: string) => {
    const encomendasAtualizadas = encomendas.map((enc) => (enc.id === id ? { ...enc, isNew: false } : enc))
    setEncomendas(encomendasAtualizadas)
    localStorage.setItem("encomendas", JSON.stringify(encomendasAtualizadas))
  }

  const marcarComoEntregue = (id: string, retiradoPor: string) => {
    const agora = new Date()
    const dataRetirada = agora.toLocaleString("pt-BR")

    const encomendasAtualizadas = encomendas.map((enc) =>
      enc.id === id ? { ...enc, entregue: true, retiradoPor, dataRetirada, isNew: false } : enc,
    )
    setEncomendas(encomendasAtualizadas)
    localStorage.setItem("encomendas", JSON.stringify(encomendasAtualizadas))
  }

  useEffect(() => {
    const t = (localStorage.getItem("userType") || "").toLowerCase()
    const admin = t === "admin"
    setIsAdmin(admin)
    if (admin) { router.replace("/inicio-admin") }
  }, [router])

  // Importante: não retornar antes de chamar todos os hooks;
  // o retorno condicional será feito mais abaixo, após os hooks.

  // Base: admin vê todas; morador vê baseado na API que já filtra por vínculos temporais
  const base = encomendas

  // Helper para obter chave AAAA-MM a partir da data (aceita ISO ou BR dd/mm/aaaa)
  const monthKeyFromDate = (value?: string) => {
    if (!value) return ""
    const s = String(value)
    let d = new Date(s)
    if (isNaN(d.getTime())) {
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
      if (m) {
        const dd = parseInt(m[1], 10)
        const mm = parseInt(m[2], 10) - 1
        const yyyy = parseInt(m[3], 10)
        d = new Date(yyyy, mm, dd)
      }
    }
    if (isNaN(d.getTime())) return ""
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${yyyy}-${mm}`
  }

  // Lista de meses disponíveis com base no conjunto base
  const mesesDisponiveis = useMemo(() => {
    const keys = new Set<string>()
    base.forEach((enc) => {
      const k = monthKeyFromDate(enc.dataRecebimento)
      if (k) keys.add(k)
    })
    return Array.from(keys).sort((a, b) => b.localeCompare(a))
  }, [encomendas, isAdmin, myBlock, myApt])

  // Filtro adicional por mês/ano
  const encomendasFiltradasPorMes = mesFiltro
    ? base.filter((enc) => monthKeyFromDate(enc.dataRecebimento) === mesFiltro)
    : base

  // Filtro por pendentes (não entregues)
  const encomendasFiltradas = onlyPending
    ? encomendasFiltradasPorMes.filter((enc) => !enc.entregue)
    : encomendasFiltradasPorMes

  const encomendasNovas = encomendasFiltradas.filter((enc) => enc.isNew)
  const encomendasVistas = encomendasFiltradas.filter((enc) => !enc.isNew)

  // (capFirst movido para escopo global)

  const logout = () => { performLogout(); router.replace("/") }

  return (
    <>
      <PullToRefresh
        onRefresh={async () => {
          // Trigger client reloads and keep the spinner visible briefly
          setRefreshTick((t) => t + 1)
          try { router.refresh() } catch {}
          await new Promise((r) => setTimeout(r, 450))
        }}
        allowWithinSelector="#filtro-mes-card"
        denyBelowSelector="#encomendas-anteriores-boundary"
      >
      <div className="container" ref={containerRef}>
        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <button type="button" className="back-link" ref={backLinkRef} onClick={logout} aria-label="Sair" title="Sair">←] Sair</button>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName).split(" ")[0]}` : " usuario"}!
            </span>
          </div>

          <div className="header">
            <h1>Minhas Encomendas</h1>
            <p>Visualize suas encomendas recebidas</p>
          </div>

          <div id="filtro-mes-card" className="card">
            <div className="form-group">
              <label className="form-label">Filtrar por Mês</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <select
                  className="form-input"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                >
                  <option value="">Todos</option>
                  {mesesDisponiveis.map((key) => (
                    <option key={key} value={key}>{formatMonthLabel(key)}</option>
                  ))}
                </select>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={onlyPending}
                    onChange={(e) => setOnlyPending(e.target.checked)}
                  />
                  Pendentes
                </label>
              </div>
            </div>
          </div>

          {erro && <div style={{ color: "crimson" }}>{erro}</div>}

          {encomendasNovas.length > 0 && (
            <div>
              <h2 style={{ color: "var(--accent)", marginBottom: "1rem", fontSize: "1.25rem" }}>
                📦 Novas Encomendas ({encomendasNovas.length})
              </h2>
              {encomendasNovas.map((encomenda) => (
                <PackageCard
                  key={encomenda.id}
                  encomenda={encomenda}
                  isNew={true}
                  user={user}
                  onMarcarVista={marcarComoVista}
                  onMarcarEntregue={marcarComoEntregue}
                />
              ))}
            </div>
          )}

          {encomendasVistas.length > 0 && (
            <div id="encomendas-anteriores-boundary">
              <h2
                style={{ color: "var(--muted-foreground)", marginBottom: "1rem", fontSize: "1.25rem", marginTop: "2rem" }}
              >
                📋 Encomendas Anteriores ({encomendasVistas.length})
              </h2>
              {encomendasVistas.map((encomenda) => (
                <PackageCard
                  key={encomenda.id}
                  encomenda={encomenda}
                  isNew={false}
                  user={user}
                  onMarcarVista={marcarComoVista}
                  onMarcarEntregue={marcarComoEntregue}
                />
              ))}
            </div>
          )}

          {encomendasFiltradas.length === 0 && (
            <div className="empty-state">
              <h3>📭 Nenhuma encomenda encontrada</h3>
              <p>
                {mesFiltro
                  ? `Não há encomendas em ${formatMonthLabel(mesFiltro)}`
                  : "Não há encomendas registradas no momento"}
              </p>
            </div>
          )}
        </div>

        <nav
          id="encomendas-nav"
          className="nav-menu nav-modern"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: navDims.width,
          }}
        >
          {!isAdmin && (
            <Link href="/inicio" className="nav-item" title="Inicio">
              <span className="nav-icon" aria-hidden="true">🏠</span>
              <span className="nav-label">Inicio</span>
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
  .nav-menu { position: fixed; bottom: 0; z-index: 1000; }
        .container { padding-bottom: 80px; }
        .field { display: flex; align-items: center; gap: 6px; }
        .label { font-weight: 700; }

        /* moderna com azul discreto */
        #encomendas-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #encomendas-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 4px; padding: 7px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #encomendas-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #encomendas-nav .nav-item:active { transform: translateY(1px); }
        #encomendas-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #encomendas-nav .nav-icon-svg { width: 18px; height: 18px; }
        #encomendas-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }
      `}</style>
      </PullToRefresh>
    </>
  )
}

function PackageCard({
  encomenda,
  isNew,
  user,
  onMarcarVista,
  onMarcarEntregue,
}: {
  encomenda: Encomenda
  isNew: boolean
  user: any
  onMarcarVista: (id: string) => void
  onMarcarEntregue: (id: string, retiradoPor: string) => void
}) {
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [retiradoPor, setRetiradoPor] = useState("")

  // Cálculo de dias pendentes a partir de dataRecebimento (ISO ou BR dd/mm/aaaa)
  const parseDate = (v?: string) => {
    if (!v) return null
    const s = String(v)
    let d = new Date(s)
    if (isNaN(d.getTime())) {
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
      if (m) {
        const dd = parseInt(m[1], 10)
        const mm = parseInt(m[2], 10) - 1
        const yyyy = parseInt(m[3], 10)
        d = new Date(yyyy, mm, dd)
      }
    }
    return isNaN(d.getTime()) ? null : d
  }
  const computePendingDays = (v?: string) => {
    const d = parseDate(v)
    if (!d) return null
    const now = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffMs = today.getTime() - start.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }
  const pendingDays = computePendingDays(encomenda.dataRecebimento)
  const pendingLabel = pendingDays == null ? null : pendingDays.toString().padStart(2, "0")

  const handleEntrega = () => {
    if (retiradoPor.trim()) {
      onMarcarEntregue(encomenda.id, retiradoPor.trim())
      setShowDeliveryForm(false)
      setRetiradoPor("")
    }
  }

  return (
    <div className={`package-card ${isNew ? "new" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3><strong>{encomenda.morador}</strong></h3>
          <p>
            <strong>Bloco:</strong> {encomenda.bloco} | <strong>Apartamento:</strong> {encomenda.apartamento}
          </p>
          <div className="field">
            <strong className="label">Empresa:</strong>{" "}
            <span className="value">{encomenda.empresa || "-"}</span>
          </div>
          <div className="field" style={{ whiteSpace: "nowrap" }}>
            <strong className="label">Recebido em:</strong>{" "}
            <span className="value" style={{ whiteSpace: "nowrap" }}>{formatDateTimeBR(encomenda.dataRecebimento)}</span>
          </div>

          {/* Recebido por (mostrar antes de Retirado por) */}
          <div className="field" style={{ marginTop: 8 }}>
            <strong className="label">Recebido por:</strong>{" "}
            <span className="value">{encomenda.recebidoPor || "-"}</span>
          </div>


          {encomenda.entregue && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                backgroundColor: "var(--success-bg)",
                borderRadius: "8px",
                border: "1px solid var(--success)",
              }}
            >
              <p style={{ color: "var(--success)", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
                ✅ Encomenda Retirada
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                <strong>Retirado por:</strong> {encomenda.retiradoPor}
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                <strong>Retirado às:</strong> {formatDateTimeBRWithComma(encomenda.dataRetirada)}
              </p>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {isNew && <span className="badge new">NOVA</span>}
          {!encomenda.entregue && (
            <>
              <span className="badge" title="Pendente" style={{ backgroundColor: "#f59e0b", color: "#111827" }}>PENDENTE</span>
              {pendingLabel != null && (
                <div style={{ color: "#334155", fontSize: 13, fontWeight: 700, lineHeight: 1.1, textAlign: "right" }}>
                  {pendingDays === 0 ? "🕒 Hoje" : `🕒 Há ${pendingLabel} ${pendingDays === 1 ? "dia" : "dias"}`}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {user?.tipo === "admin" && !encomenda.entregue && (
          <button
            onClick={() => setShowDeliveryForm(!showDeliveryForm)}
            className="btn btn-primary"
            style={{ padding: "0.5rem 1rem" }}
          >
            Confirmar Retirada
          </button>
        )}
      </div>

      {showDeliveryForm && user?.tipo === "admin" && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "var(--card)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <div className="form-group">
            <label className="form-label">Retirado por:</label>
            <input
              type="text"
              className="form-input"
              value={retiradoPor}
              onChange={(e) => setRetiradoPor(capFirst(e.target.value))} // <- aplica capitalização
              placeholder="Nome de quem retirou a encomenda"
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={handleEntrega}
              className="btn btn-primary"
              disabled={!retiradoPor.trim()}
              style={{ padding: "0.5rem 1rem" }}
            >
              Confirmar Retirada
            </button>
            <button
              onClick={() => setShowDeliveryForm(false)}
              className="btn btn-outline"
              style={{ padding: "0.5rem 1rem" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDateTimeBR(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// Apenas para o subcard verde: "DD/MM/YYYY, HH:mm" (sem segundos)
function formatDateTimeBRWithComma(value?: string) {
  if (!value) return "-"
  const s = String(value)
  // Se já vier como "DD/MM/YYYY HH:mm" ou "DD/MM/YYYY, HH:mm[:ss]", normaliza para vírgula sem segundos
  const m = s.match(/^(\d{2}\/\d{2}\/\d{4})[ ,]?(\d{2}:\d{2})(?::\d{2})?$/)
  if (m) return `${m[1]}, ${m[2]}`
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`
}
