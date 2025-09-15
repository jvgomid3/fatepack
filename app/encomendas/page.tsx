"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import AdminMenu from "../components/AdminMenu"

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

export default function EncomendasPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [apartamentoFiltro, setApartamentoFiltro] = useState("")
  const [user, setUser] = useState<any>(null)
  const [myBlock, setMyBlock] = useState<string | null>(null)
  const [myApt, setMyApt] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [erro, setErro] = useState("")
  const backLinkRef = useRef<HTMLAnchorElement | null>(null)
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

    // iguala a cor do "Olá, ..." à cor do link "← Sair"
    const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLAnchorElement | null)
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
            const items = Array.isArray(data)
              ? data.map((r: any) => ({
                  id: r.id ?? r.id_encomenda,
                  bloco: r.bloco,
                  apartamento: r.apartamento,
                  empresa_entrega: r.empresa_entrega ?? r.empresa,
                  data_recebimento: r.data_recebimento,
                  retirado_por: r.retirado_por ?? r.nome_retirou,
                  data_retirada: r.data_retirada,
                  nome: r.nome,
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
  }, [router])

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
    if (admin) router.replace("/historico")
  }, [router])

  if (isAdmin) return null

  // Base: admin vê todas; morador vê apenas dele (bloco/apto)
  const base = isAdmin
    ? encomendas
    : encomendas.filter((enc) => {
        const okBloco = myBlock ? enc.bloco === myBlock : false
        const okApt = myApt ? enc.apartamento === myApt : false
        return okBloco && okApt
      })

  // Filtro adicional por input (opcional)
  const encomendasFiltradas = apartamentoFiltro
    ? base.filter((enc) => enc.apartamento === apartamentoFiltro)
    : base

  const encomendasNovas = encomendasFiltradas.filter((enc) => enc.isNew)
  const encomendasVistas = encomendasFiltradas.filter((enc) => !enc.isNew)

  // Capitaliza a primeira letra não-espaço
  const capFirst = (s: string) => {
    const i = s.search(/\S/)
    if (i === -1) return ""
    return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
  }

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
    setTimeout(() => window.location.replace("/"), 100)
  }

  return (
    <>
      <div className="container" ref={containerRef}>
        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName).split(" ")[0]}` : " usuario"}!
            </span>
          </div>

          <div className="header">
            <h1>Minhas Encomendas</h1>
            <p>Visualize suas encomendas recebidas</p>
          </div>

          <div className="card">
            <div className="form-group">
              <label className="form-label">Filtrar por Apartamento</label>
              <input
                type="text"
                className="form-input"
                value={apartamentoFiltro}
                onChange={(e) => setApartamentoFiltro(e.target.value)}
                placeholder="Digite o número do apartamento (ex: 101)"
              />
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
            <div>
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
                {apartamentoFiltro
                  ? `Não há encomendas para o apartamento ${apartamentoFiltro}`
                  : "Não há encomendas registradas no momento"}
              </p>
            </div>
          )}
        </div>

        <nav
          className="nav-menu"
          style={{
            left: "50%",
            transform: "translateX(-50%)", // centraliza horizontalmente
            width: navDims.width,           // mantém mesma largura do container
          }}
        >
          <button
            type="button"
            className="nav-item"
            onClick={logout}
            aria-label="Sair"
            title="Sair"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <div className="nav-icon" aria-hidden="true">↩️</div>
            Sair
          </button>

          {isAdmin ? (
            <>
              <Link href="/registrar" className="nav-item">
                <div className="nav-icon">📦</div>
                Registrar Encomendas
              </Link>
              <Link href="/historico" className="nav-item">
                <div className="nav-icon">📊</div>
                Histórico
              </Link>
            </>
          ) : (
            <>
              <Link href="/inicio" className="nav-item active">
                <div className="nav-icon">🏠</div>
                Início
              </Link>
            </>
          )}
        </nav>
      </div>

      <style jsx>{`
        .nav-menu {
          position: fixed;
          bottom: 0;
          z-index: 1000;
          background: var(--card, #fff);
          border-top: 1px solid #e5e7eb;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px));
        }
        .container {
          padding-bottom: 80px;
        }
        .field { display: flex; align-items: center; gap: 6px; }
        .label { font-weight: 700; }
      `}</style>
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
          <h3>{encomenda.morador}</h3>
          <p>
            <strong>Bloco:</strong> {encomenda.bloco} | <strong>Apartamento:</strong> {encomenda.apartamento}
          </p>
          <div className="field">
            <strong className="label">Empresa:</strong>{" "}
            <span className="value">{encomenda.empresa_entrega || "-"}</span>
          </div>
          <div className="field">
            <strong className="label">Recebido em:</strong>{" "}
            <span className="value">{formatDateTimeBR(encomenda.data_recebimento)}</span>
          </div>

          {/* mostrar retirada quando existir algum dos campos */}
          {(encomenda.retirado_por || encomenda.data_retirada) && (
            <>
              <div className="field">
                <strong className="label">Retirado por:</strong>{" "}
                <span className="value">{encomenda.retirado_por || "-"}</span>
              </div>
              <div className="field">
                <strong className="label">Retirado às:</strong>{" "}
                <span className="value">{formatDateTimeBR(encomenda.data_retirada)}</span>
              </div>
            </>
          )}

          <p className="status">{encomenda.status}</p>

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
                <strong>Retirado às:</strong> {encomenda.dataRetirada}
              </p>
            </div>
          )}
        </div>
        {isNew && <span className="badge new">NOVA</span>}
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
