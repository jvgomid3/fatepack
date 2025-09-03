"use client"

import { useEffect, useState, useRef } from "react" // <- adicionado useRef
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

export default function HistoricoPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [user, setUser] = useState<any>(null)
  const [showInputId, setShowInputId] = useState<string | null>(null)
  const [nomeRetirada, setNomeRetirada] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmLoadingId, setConfirmLoadingId] = useState<string | null>(null) // novo
  const backLinkRef = useRef<HTMLAnchorElement | null>(null) // novo
  const helloRef = useRef<HTMLSpanElement | null>(null)       // novo

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null")
    setUser(userData)
    setIsAdmin(localStorage.getItem("userType") === "admin")

    const loadFromDB = async () => {
      try {
        const res = await fetch(`/api/encomendas?ts=${Date.now()}`, { cache: "no-store" })
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
        localStorage.setItem("historico_encomendas", JSON.stringify(list))
      } catch {
        const cached = JSON.parse(localStorage.getItem("historico_encomendas") || "[]")
        setEncomendas(cached)
      }
    }

    // aplica a mesma cor do link "Voltar ao início" na saudação
    const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLAnchorElement | null)
    if (linkEl && helloRef.current) {
      const cs = window.getComputedStyle(linkEl)
      helloRef.current.style.color = cs.color
    }

    loadFromDB()
    const id = setInterval(loadFromDB, 30000)
    return () => clearInterval(id)
  }, [])

  const empresasUnicas = [...new Set(encomendas.map((enc) => enc.empresa))].sort()

  const mesesUnicos = [
    ...new Set(
      encomendas.map((enc) => {
        const data = new Date(enc.dataRecebimento.split(", ")[0].split("/").reverse().join("-"))
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
      }),
    ),
  ]
    .sort()
    .reverse()

  const encomendasFiltradas = encomendas.filter((enc) => {
    const passaEmpresa = !filtroEmpresa || enc.empresa === filtroEmpresa

    let passaMes = true
    if (filtroMes) {
      const dataEnc = new Date(enc.dataRecebimento.split(", ")[0].split("/").reverse().join("-"))
      const mesEnc = `${dataEnc.getFullYear()}-${String(dataEnc.getMonth() + 1).padStart(2, "0")}`
      passaMes = mesEnc === filtroMes
    }

    return passaEmpresa && passaMes
  })

  const limparFiltros = () => {
    setFiltroEmpresa("")
    setFiltroMes("")
  }

  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split("-")
    const meses = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
    ]
    return `${meses[Number.parseInt(mes) - 1]} ${ano}`
  }

  return (
    <>
      <AdminGate />
      <div className="container">
        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Voltar ao início</Link>
            <span ref={helloRef} style={{ fontWeight: 600 }}>
              Olá, Administrador!
            </span>
          </div>

          <div className="header">
            <h1>Histórico de Encomendas</h1>
            <p>Visualize todas as encomendas registradas</p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "1rem", color: "var(--foreground)" }}>Filtros</h3>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select className="form-select" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
                  <option value="">Todas as empresas</option>
                  {empresasUnicas.map((empresa) => (
                    <option key={empresa} value={empresa}>
                      {empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mês</label>
                <select className="form-select" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}>
                  <option value="">Todos os meses</option>
                  {mesesUnicos.map((mes) => (
                    <option key={mes} value={mes}>
                      {formatarMes(mes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(filtroEmpresa || filtroMes) && (
              <button onClick={limparFiltros} className="btn btn-outline">
                🗑️ Limpar Filtros
              </button>
            )}
          </div>

          <div style={{ marginBottom: "1rem", color: "var(--muted-foreground)", textAlign: "center" }}>
            <strong>{encomendasFiltradas.length}</strong> encomenda(s) encontrada(s)
          </div>

          {encomendasFiltradas.length > 0 ? (
            encomendasFiltradas.map((encomenda) => (
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
                {filtroEmpresa || filtroMes
                  ? "Tente ajustar os filtros para encontrar encomendas"
                  : "Não há encomendas registradas no histórico"}
              </p>
            </div>
          )}
        </div>

        <nav className="nav-menu">
          <Link href="/" className="nav-item">
            <div className="nav-icon">🏠</div>
            Início
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
    </>
  )
}
