"use client"

import { useState, useEffect } from "react"
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
  isNew: boolean
  retiradoPor?: string
  dataRetirada?: string
  entregue?: boolean
}

export default function HistoricoPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([])
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [filtroMes, setFiltroMes] = useState("")
  const [user, setUser] = useState<any>(null)
  const [showInputId, setShowInputId] = useState<string | null>(null)
  const [nomeRetirada, setNomeRetirada] = useState("")

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null")
    setUser(userData)

    const encomendasSalvas = JSON.parse(localStorage.getItem("encomendas") || "[]")
    setEncomendas(encomendasSalvas)
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
    return `${meses[Number.parseInt(mes) - 1]} ${ano}`
  }

  return (
    <>
      <AdminGate />
      <div className="container">
        <div className="main-content">
          <Link href="/" className="back-link">
            ← Voltar ao início
          </Link>

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
                          onChange={(e) => setNomeRetirada(e.target.value)}
                          style={{ marginRight: 8 }}
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "0.5rem 1rem" }}
                          onClick={() => {
                            // Atualiza a encomenda como entregue
                            const novas = encomendas.map((e) =>
                              e.id === encomenda.id
                                ? {
                                    ...e,
                                    entregue: true,
                                    retiradoPor: nomeRetirada,
                                    dataRetirada: new Date().toLocaleString("pt-BR"),
                                  }
                                : e
                            );
                            setEncomendas(novas);
                            localStorage.setItem("encomendas", JSON.stringify(novas));
                            setShowInputId(null);
                            setNomeRetirada("");
                          }}
                          disabled={!nomeRetirada.trim()}
                        >
                          Confirmar
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.5rem 1rem", marginLeft: 8 }}
                          onClick={() => {
                            setShowInputId(null);
                            setNomeRetirada("");
                          }}
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
          {user?.tipo === "admin" && (
            <Link href="/registrar" className="nav-item">
              <div className="nav-icon">📦</div>
              Registrar
            </Link>
          )}
          <Link href="/encomendas" className="nav-item">
            <div className="nav-icon">📋</div>
            Encomendas
          </Link>
          <Link href="/historico" className="nav-item active">
            <div className="nav-icon">📊</div>
            Histórico
          </Link>
        </nav>
      </div>
    </>
  )
}
