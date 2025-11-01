"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Package, LogOut, AlertTriangle, UserRound } from "lucide-react"
import AdminGate from "../components/AdminGate"
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
  entregue?: boolean
  retiradoPor?: string
  dataRetirada?: string
}

// Capitaliza a primeira letra de cada palavra (suporta hífen) e normaliza restante em minúsculas
const capFirst = (s: string) => {
  const toTitle = (w: string) => (w ? w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1) : w)
  return (s || "")
    .toLowerCase()
    .split(/(\s+)/) // preserva espaços
    .map((tok) => (tok.trim() === "" ? tok : tok.split("-").map(toTitle).join("-")))
    .join("")
}

// >>> novo: formata "YYYY-MM" para "Mês/Ano"
const formatarMes = (ym: string) => {
  const [ano, mes] = ym.split("-")
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]
  const idx = Number(mes)
  if (!ano || !idx || idx < 1 || idx > 12) return ym
  return `${nomes[idx - 1]}/${ano}`
}

// formata "YYYY-MM-DDTHH:mm:ssZ" -> "DD/MM/YYYY HH:mm"
function formatBRDateTime(v?: string) {
  if (!v) return ""

  // If value already looks like a formatted BR date (DD/MM/YYYY...), return as-is.
  // This prevents re-parsing a server-formatted string and avoids locale parsing quirks.
  if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v).trim())) return String(v)

  const d = new Date(v)
  if (isNaN(d.getTime())) return ""

  // Force formatting in São Paulo timezone to match server-side formatting
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

// Formata uma string de timestamp para BR, assumindo que valores sem
// timezone (ex: "2025-10-29T09:00:00") representam hora local de
// São Paulo (UTC-3). Isto evita que o cliente interprete o horário como
// em outro fuso e mostre -3h antes da atualização completa.
function formatBRDateTimeAssumeSaoPaulo(v?: string) {
  if (!v) return ""
  // já está no formato BR
  if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v).trim())) return String(v)

  // se a string já tem um offset ('Z' ou +HH:MM / -HH:MM), usa normalmente
  if (/[zZ]$|[+\-]\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    if (isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  }

  // Caso sem timezone (ex: 2025-10-29T09:00:00), parse manualmente e
  // construir o instante correto assumindo UTC-3.
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return formatBRDateTime(v)
  const [, yyyy, mm, dd, hh, min, ss] = m
  // converter para UTC adicionando 3 horas (UTC-3 -> UTC)
  const utcMillis = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh) + 3, Number(min), Number(ss))
  const d = new Date(utcMillis)
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

export default function HistoricoPage() {
  const router = useRouter()
  const logout = () => { performLogout(); router.replace("/") }

  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const encomendasRef = useRef<Encomenda[]>(encomendas)
  const [refreshTick, setRefreshTick] = useState(0)
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [filtroMes, setFiltroMes] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    return `${yyyy}-${mm}`
  })
  const [filtroBloco, setFiltroBloco] = useState("")
  const [filtroApto, setFiltroApto] = useState("")
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [showInputId, setShowInputId] = useState<string | null>(null)
  const [nomeRetirada, setNomeRetirada] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmEmail, setIsAdmEmail] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [onlyPending, setOnlyPending] = useState(false)
  const displayName = (currentUser && (currentUser.name || currentUser.nome)) || (typeof window !== "undefined" ? localStorage.getItem("userName") : null) || "Administrador"
  const [confirmLoadingId, setConfirmLoadingId] = useState<string | null>(null) // novo
  const backLinkRef = useRef<HTMLButtonElement | null>(null) // novo
  const helloRef = useRef<HTMLSpanElement | null>(null)       // novo
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const [showPickupPopup, setShowPickupPopup] = useState(false)
  const [lastRetiradoPor, setLastRetiradoPor] = useState("")
  const pickupStartRef = useRef<number | null>(null)

  useEffect(() => {
    encomendasRef.current = encomendas
  }, [encomendas])
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null")
    setUser(userData)
    setIsAdmin(localStorage.getItem("userType") === "admin")

    // cor da saudação
  const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLElement | null)
    if (linkEl && helloRef.current) {
      const cs = window.getComputedStyle(linkEl)
      helloRef.current.style.color = cs.color
    }
    // define se o e-mail logado é exatamente "adm"
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "")
      .trim()
      .toLowerCase()
    setIsAdmEmail(email === "adm")
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

  // carrega do banco (admin: todas as encomendas)
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`/api/encomendas?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail || data?.error || "Erro ao buscar encomendas")

      // API /api/encomendas (admin) retorna array de rows com:
      // id, empresa_entrega, data_recebimento, bloco, apartamento, nome, recebido_por,
      // retirado_por, data_retirada
      const list: Encomenda[] = (Array.isArray(data) ? data : []).map((row: any) => ({
        id: String(row.id ?? row.id_encomenda ?? ""),
        bloco: String(row.bloco ?? ""),
        apartamento: String(row.apartamento ?? ""),
        morador: String(row.nome ?? ""),
        empresa: String(row.empresa_entrega ?? row.empresa ?? ""),
        dataRecebimento: formatBRDateTime(row.data_recebimento ?? row.dataRecebimento),
        status: `Recebido por ${row.recebido_por ?? "-"}`,
        entregue: Boolean(row.retirado_por || row.data_retirada),
        retiradoPor: row.retirado_por ?? row.nome_retirou ?? "",
        // If we have a recent client-side locked value (just updated), prefer it
        // to avoid a server-side formatting race that would shift the time.
        dataRetirada: (() => {
          try {
            const local = encomendasRef.current.find((e) => e.id === String(row.id ?? row.id_encomenda ?? "")) as any
            if (local && local.__clientTsLock && local.__clientTsLock > Date.now() && local.dataRetirada) {
              return local.dataRetirada
            }
          } catch {}
          return formatBRDateTimeAssumeSaoPaulo(row.data_retirada ?? row.data_retirada_fmt)
        })(),
      }))

      setEncomendas(list)
    }

    load().catch((e) => {
      console.error(e)
      setEncomendas([])
    })

    // atualiza a cada 30s
    const id = setInterval(() => load().catch(() => { }), 30000)
    return () => clearInterval(id)
  }, [refreshTick])

  const handleRefresh = async () => {
    setRefreshTick((t) => t + 1)
    try {
      router.refresh()
    } catch { }
    // manter o spinner visível por um curto período
    await new Promise((r) => setTimeout(r, 450))
  }

  // Helper: extrai chave AAAA-MM a partir de dataRecebimento ("DD/MM/AAAA HH:mm" ou ISO)
  const monthKeyFromDate = (value?: string) => {
    if (!value) return ""
    const s = String(value)
    // tenta regex BR
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) {
      const yyyy = m[3]
      const mm = m[2]
      return `${yyyy}-${mm}`
    }
    // fallback Date
    const d = new Date(s)
    if (isNaN(d.getTime())) return ""
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    return `${yyyy}-${mm}`
  }

  // Deriva meses disponíveis a partir das encomendas carregadas
  useEffect(() => {
    const set = new Set<string>()
    encomendas.forEach((e) => {
      const k = monthKeyFromDate(e.dataRecebimento)
      if (k) set.add(k)
    })
    let arr = Array.from(set).sort((a, b) => b.localeCompare(a))
    // garante que o mês atual exista na lista para ser selecionável por padrão
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    if (!arr.includes(currentKey)) arr = [currentKey, ...arr]
    setMesesDisponiveis(arr)
  }, [encomendas])

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

  // lista final considerando todos os filtros
  const base = onlyPending ? encomendas.filter((e) => !e.entregue) : encomendas
  const listaFiltrada = base.filter((e) => {
    if (filtroBloco && e.bloco !== filtroBloco) return false
    if (filtroApto && e.apartamento !== filtroApto) return false
    if (filtroEmpresa && e.empresa !== filtroEmpresa) return false
    if (filtroMes) {
      const k = monthKeyFromDate(e.dataRecebimento)
      if (k !== filtroMes) return false
    }
    return true
  })

  return (
    <>
      <AdminGate />
  <PullToRefresh onRefresh={handleRefresh} denyBelowSelector="#historico-filtro-mes">
      <div className="container" ref={containerRef}>
        <div className="main-content">
          {showPickupPopup && (
            <div
              className="pickup-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="retirada-ok-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  const t0 = pickupStartRef.current ?? 0
                  if (Date.now() - t0 >= 4000) setShowPickupPopup(false)
                }
              }}
            >
              <div className="pickup-card" role="document">
                <div className="pickup-scene" aria-hidden="true">
                  <span className="pickup-box">📦</span>
                  <span className="pickup-hand">🫴🏼</span>
                  <span className="pickup-check">✅</span>
                </div>
                <h3 id="retirada-ok-title" className="pickup-title">Retirada confirmada!</h3>
                <p className="pickup-small">Retirado por {lastRetiradoPor}</p>
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="back-link" ref={backLinkRef} onClick={logout} aria-label="Sair" title="Sair">←] Sair</button>
            <span ref={helloRef} style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName)}` : " Administrador"}!
            </span>
          </div>

          <div className="header">
            <h1>Histórico de Encomendas</h1>
            <p>Visualize todas as encomendas registradas</p>
          </div>

          {/* Filtros */}
          <div id="historico-filtros" className="card" style={{ marginBottom: "1rem" }}>
            <div className="form-grid" style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
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
              <div className="form-group" id="historico-filtro-empresa">
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
              <div className="form-group" id="historico-filtro-mes">
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

            {/* Filtro de pendentes (abaixo do botão Limpar filtros) */}
            <div style={{ marginTop: "0.5rem" }}>
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

          {/* Contagem considerando o filtro de pendentes */}
          <div style={{ marginBottom: "1rem", color: "var(--muted-foreground)", textAlign: "center" }}>
            <strong>{listaFiltrada.length}</strong> encomenda(s) encontrada(s)
          </div>

          {/* Lista usa encomendas ou somente pendentes conforme o checkbox */}
          {listaFiltrada.length > 0 ? (
            listaFiltrada.map((encomenda) => (
              <div key={encomenda.id} className={`package-card ${encomenda.entregue ? "success" : ""}`}>
                <h3>{encomenda.morador}</h3>
                <p>
                  <strong>Bloco:</strong>{" "} {encomenda.bloco} {" | "} <strong>Apt:</strong>{" "} {encomenda.apartamento}
                </p>
                <p>
                  <strong>Empresa:</strong>{" "} {encomenda.empresa}
                </p>
                <p>
                  <strong>Recebido em:</strong>{" "} {encomenda.dataRecebimento}
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
                    <p style={{ color: "var(--success)", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
                      ✅ Encomenda Retirada
                    </p>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>
                      <strong>Retirado por:</strong>{" "} {encomenda.retiradoPor || "-"}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>
                      <strong>Retirado às:</strong>{" "} {encomenda.dataRetirada || "-"}
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
                          style={{ padding: "0.5rem 1rem", transform: "translateY(12px)" }}
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
                              // Usar SOMENTE o timestamp formatado que vem do servidor (já está em São Paulo)
                              const serverFormatted = data?.data_retirada_fmt || ""
                              const novas = encomendas.map((e) =>
                                e.id === encomenda.id
                                  ? { ...e, entregue: true, retiradoPor: String(data?.nome_retirou || nome), dataRetirada: String(serverFormatted) }
                                  : e
                              )
                              setEncomendas(novas)
                              localStorage.setItem("historico_encomendas", JSON.stringify(novas))
                              setShowInputId(null)
                              setNomeRetirada("")
                              // guardar quem retirou para mostrar no popup
                              setLastRetiradoPor(String(data?.nome_retirou || nome))
                              // Mostrar pop-up animado (caixa sendo puxada e check) por 3s
                              pickupStartRef.current = Date.now()
                              setShowPickupPopup(true)
                              setTimeout(() => {
                                setShowPickupPopup(false)
                                pickupStartRef.current = null
                              }, 4000)
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
                          style={{ padding: "0.5rem 1rem", display: "block", margin: "8px auto 0" }}
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

                {!encomenda.entregue && (
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
                {onlyPending || filtroEmpresa || filtroMes || filtroBloco || filtroApto
                  ? "Tente ajustar os filtros para encontrar encomendas"
                  : "Não há encomendas registradas no histórico"}
              </p>
            </div>
          )}
        </div>

        <nav
          id="historico-nav"
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

          {isAdmEmail && (
            <Link href="/moradores" className="nav-item" title="Moradores">
              <span className="nav-icon" aria-hidden="true">👤</span>
              <span className="nav-label">Moradores</span>
            </Link>
          )}

          <Link href="/aviso" className="nav-item" title="Aviso">
            <span className="nav-icon" aria-hidden="true">⚠️</span>
            <span className="nav-label">Aviso</span>
          </Link>

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
      </PullToRefresh>

      <style jsx>{`
        /* base */
  .nav-menu { position: fixed; bottom: 0; z-index: 1000; }
        .container { padding-bottom: 80px; }

        /* moderna com azul discreto */
        #historico-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #historico-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 4px; padding: 7px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #historico-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #historico-nav .nav-item:active { transform: translateY(1px); }
        #historico-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #historico-nav .nav-icon-svg { width: 18px; height: 18px; }
        #historico-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }

        /* Espaçamento mais justo entre filtros no Histórico */
        #historico-filtros .form-group { margin-bottom: 4px; }
        #historico-filtros .form-label { margin-bottom: 2px; display: inline-block; }

        /* Popup de retirada confirmada */
        .pickup-overlay {
          position: fixed; inset: 0; z-index: 1100;
          background: rgba(15, 23, 42, 0.45);
          display: flex; align-items: center; justify-content: center;
          animation: overlayFade .18s ease-out;
        }
        .pickup-card {
          position: relative; width: min(520px, 92vw);
          background: #ffffff; border-radius: 16px;
          padding: 22px 18px 16px; text-align: center;
          border: 1px solid rgba(2,132,199,.25);
          box-shadow: 0 30px 80px rgba(2,132,199,.25), 0 8px 24px rgba(15,23,42,.18);
          animation: cardPop .22s cubic-bezier(.18,.89,.32,1.28);
        }
  .pickup-title { margin: 8px 0 0; font-size: 20px; font-weight: 800; color: #0f172a; }
  .pickup-small { margin: 0 0 12px; font-size: 13px; color: #334155; }
  .pickup-scene { position: relative; height: 140px; overflow: hidden; margin-bottom: 4px; }
  .pickup-box { position: absolute; z-index: 1; font-size: 56px; left: 50%; top: 10px; transform: translateX(60px); filter: drop-shadow(0 6px 12px rgba(2,132,199,.25)); animation: dragBox 2s ease-in-out forwards; }
  .pickup-hand { position: absolute; z-index: 0; font-size: 44px; left: 50%; top: 62px; transform: translateX(60px); animation: handMove 2s ease-in-out forwards; }
  .pickup-check { position: absolute; z-index: 2; font-size: 42px; left: 50%; top: 0px; transform: translate(-50%, 0) scale(.6); opacity: 0; animation: checkPop .5s ease-out forwards; animation-delay: 1.5s; }
        @keyframes dragBox { 0% { transform: translateX(60px) } 60% { transform: translateX(-20px) } 100% { transform: translateX(-60px) } }
  @keyframes handMove { 0% { transform: translateX(60px) } 60% { transform: translateX(-20px) } 100% { transform: translateX(-60px) } }
        @keyframes checkPop { from { opacity: 0; transform: translate(-50%,0) scale(.6) } to { opacity: 1; transform: translate(-50%,0) scale(1) } }
        @keyframes overlayFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cardPop { from { transform: scale(.92); opacity: .6 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </>
  )
}
