"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import AdminGate from "../components/AdminGate"

interface Encomenda {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  dataRecebimento: string
  status: string
  entregue?: boolean
  retiradoPor?: string
  dataRetirada?: string
}

// Capitaliza a primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

// >>> novo: formata "YYYY-MM" para "Mês Ano"
const formatarMes = (ym: string) => {
  const [ano, mes] = ym.split("-")
  const nomes = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ]
  const idx = Number(mes)
  if (!ano || !idx || idx < 1 || idx > 12) return ym
  return `${nomes[idx - 1]} ${ano}`
}

export default function HistoricoPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [filtroBloco, setFiltroBloco] = useState("")
  const [filtroApto, setFiltroApto] = useState("")
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [showInputId, setShowInputId] = useState<string | null>(null)
  const [nomeRetirada, setNomeRetirada] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmLoadingId, setConfirmLoadingId] = useState<string | null>(null) // novo
  const backLinkRef = useRef<HTMLAnchorElement | null>(null) // novo
  const helloRef = useRef<HTMLSpanElement | null>(null)       // novo
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null")
    setUser(userData)
    setIsAdmin(localStorage.getItem("userType") === "admin")

    // cor da saudação
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

  // carrega do banco sempre que filtros mudarem (e a cada 30s, com os filtros atuais)
  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams()
      if (filtroEmpresa) params.set("empresa", filtroEmpresa)
      if (filtroMes)     params.set("mes", filtroMes)
      if (filtroBloco)   params.set("bloco", filtroBloco)
      if (filtroApto)    params.set("apartamento", filtroApto)

      const res = await fetch(`/api/encomendas?${params.toString()}&ts=${Date.now()}`, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail || data?.error || "Erro ao buscar encomendas")

      const list: Encomenda[] = (data?.rows || []).map((row: any) => ({
        id: String(row.id_encomenda ?? ""),
        bloco: String(row.bloco ?? ""),
        apartamento: String(row.apartamento ?? ""),
        morador: String(row.nome ?? ""),
        empresa: String(row.empresa_entrega ?? ""),
        dataRecebimento: String(row.data_recebimento_fmt ?? ""),
        status: `Recebido por ${row.recebido_por ?? "-"}`,
        entregue: Boolean(row.nome_retirou),
        retiradoPor: row.nome_retirou ?? undefined,
        dataRetirada: row.data_retirada_fmt ?? undefined,
      }))

      setEncomendas(list)
      if (Array.isArray(data?.months)) setMesesDisponiveis(data.months)
    }

    load().catch((e) => {
      console.error(e)
      setEncomendas([])
    })

    const id = setInterval(() => load().catch(() => {}), 30000)
    return () => clearInterval(id)
  }, [filtroEmpresa, filtroMes, filtroBloco, filtroApto])

  // opções (derivadas do resultado atual, incluindo dependência Bloco -> Apt)
  const empresasUnicas = [...new Set(encomendas.map((e) => e.empresa))].sort()
  const blocosUnicos = [...new Set(encomendas.map((e) => e.bloco))].sort()
  const aptosBase = filtroBloco ? encomendas.filter((e) => e.bloco === filtroBloco) : encomendas
  const aptosUnicos = [...new Set(aptosBase.map((e) => e.apartamento))].sort((a, b) =>
    String(a).localeCompare(String(b), "pt-BR", { numeric: true })
  )

  const limparFiltros = () => {
    setFiltroEmpresa("")
    setFiltroMes("")
    setFiltroBloco("")
    setFiltroApto("")
  }

  return (
    <>
      <AdminGate />
      <div className="container" ref={containerRef}>
        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
            <span ref={helloRef} style={{ fontWeight: 600 }}>
              Olá, Administrador!
            </span>
          </div>

          <div className="header">
            <h1>Histórico de Encomendas</h1>
            <p>Visualize todas as encomendas registradas</p>
          </div>

          {/* Filtros */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="form-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
              {/* Bloco */}
              <div className="form-group">
                <label className="form-label">Bloco</label>
                <select
                  className="form-select"
                  value={filtroBloco}
                  onChange={(e) => {
                    setFiltroBloco(e.target.value)
                    setFiltroApto("") // reset apto ao trocar bloco
                  }}
                >
                  <option value="">Todos</option>
                  {blocosUnicos.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Apartamento */}
              <div className="form-group">
                <label className="form-label">Apartamento</label>
                <select
                  className="form-select"
                  value={filtroApto}
                  onChange={(e) => setFiltroApto(e.target.value)}
                >
                  <option value="">Todos</option>
                  {aptosUnicos.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Empresa (já existia) */}
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select
                  className="form-select"
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                >
                  <option value="">Todas</option>
                  {empresasUnicas.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Mês */}
              <div className="form-group">
                <label className="form-label">Mês</label>
                <select
                  className="form-select"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                >
                  <option value="">Todos</option>
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>{formatarMes(m)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <button className="btn btn-outline" onClick={limparFiltros}>Limpar filtros</button>
            </div>
          </div>

          {/* Contagem com base no resultado do banco */}
          <div style={{ marginBottom: "1rem", color: "var(--muted-foreground)", textAlign: "center" }}>
            <strong>{encomendas.length}</strong> encomenda(s) encontrada(s)
          </div>

          {/* Lista usa diretamente encomendas (sem encomendasFiltradas) */}
          {encomendas.length > 0 ? (
            encomendas.map((encomenda) => (
              <div key={encomenda.id} className={`package-card ${encomenda.entregue ? "success" : ""}`}>
                <h3>{encomenda.morador}</h3>
                <p>
                  <strong>Bloco:</strong> {encomenda.bloco} | <strong>Apt:</strong> {encomenda.apartamento}
                </p>
                <p>
                  <strong>Empresa:</strong> {encomenda.empresa}
                </p>
                <p>
                  <strong>Recebido em:</strong> {encomenda.dataRecebimento}
                </p>
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
                    <p style={{ color: "var(--success)", fontWeight: "600", margin: "0 0 0.5rem 0" }}>
                      ✅ Encomenda Retirada
                    </p>
                    <p style={{ margin: "0", fontSize: "0.9rem" }}>
                      <strong>Retirado por:</strong> {encomenda.retiradoPor}
                    </p>
                    <p style={{ margin: "0", fontSize: "0.9rem" }}>
                      <strong>Retirado às:</strong> {encomenda.dataRetirada}
                    </p>
                  </div>
                )}

                {/* Botão e campo SEMPRE aparecem para encomenda não entregue */}
                {!encomenda.entregue && (
                  <div style={{ marginTop: "1rem" }}>
                    {showInputId !== encomenda.id ? (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "0.5rem 1rem" }}
                        onClick={() => {
                          setShowInputId(encomenda.id);
                          setNomeRetirada("");
                        }}
                      >
                        Confirmar Retirada
                      </button>
                    ) : (
                      <div style={{ marginTop: "1rem" }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nome de quem retirou"
                          value={nomeRetirada}
                          onChange={(e) => setNomeRetirada(capFirst(e.target.value))}
                          style={{ marginRight: 8 }}
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "0.5rem 1rem" }}
                          onClick={async () => {
                            const nome = capFirst(nomeRetirada.trim())
                            if (!nome) return
                            try {
                              setConfirmLoadingId(encomenda.id)
                              const res = await fetch("/api/retiradas", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id_encomenda: Number(encomenda.id),
                                  nome_retirou: nome,
                                }),
                              })
                              const data = await res.json().catch(() => null)
                              if (!res.ok) throw new Error(data?.detail || data?.error || "Erro ao confirmar retirada")

                              const novas = encomendas.map((e) =>
                                e.id === encomenda.id
                                  ? {
                                      ...e,
                                      entregue: true,
                                      retiradoPor: String(data?.nome_retirou || nome),
                                      dataRetirada: String(data?.data_retirada_fmt || ""),
                                    }
                                  : e
                              )
                              setEncomendas(novas)
                              localStorage.setItem("historico_encomendas", JSON.stringify(novas))
                              setShowInputId(null)
                              setNomeRetirada("")
                            } catch (err: any) {
                              alert(err?.message || "Falha ao confirmar retirada")
                            } finally {
                              setConfirmLoadingId(null)
                            }
                          }}
                          disabled={!nomeRetirada.trim() || confirmLoadingId === encomenda.id}
                        >
                          {confirmLoadingId === encomenda.id ? "Confirmando..." : "Confirmar"}
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.5rem 1rem", marginLeft: 8 }}
                          onClick={() => {
                            if (confirmLoadingId) return
                            setShowInputId(null)
                            setNomeRetirada("")
                          }}
                          disabled={confirmLoadingId === encomenda.id}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {encomenda.isNew && !encomenda.entregue && (
                  <span
                    className="badge"
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 1,
                    }}
                  >
                    NOVA
                  </span>
                )}
                {encomenda.entregue && <span className="badge success">ENTREGUE</span>}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>📊 Nenhuma encomenda encontrada</h3>
              <p>
                {filtroEmpresa || filtroMes || filtroBloco || filtroApto
                  ? "Tente ajustar os filtros para encontrar encomendas"
                  : "Não há encomendas registradas no histórico"}
              </p>
            </div>
          )}
        </div>

        <nav className="nav-menu" style={{ left: navDims.left, width: navDims.width }}>
          <Link href="/" className="nav-item">
            <div className="nav-icon">➜]</div>
            Sair
          </Link>

          {isAdmin ? (
            <>
              <Link href="/registrar" className="nav-item">
                <div className="nav-icon">📦</div>
                Registrar
              </Link>
              <Link href="/historico" className="nav-item active">
                <div className="nav-icon">📊</div>
                Histórico
              </Link>
            </>
          ) : (
            <Link href="/encomendas" className="nav-item">
              <div className="nav-icon">📋</div>
              Encomendas
            </Link>
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
        .container { padding-bottom: 80px; }
      `}</style>
    </>
  )
}
