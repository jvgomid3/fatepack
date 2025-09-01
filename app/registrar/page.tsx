"use client"

import type React from "react"
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
  recebidoPor?: string // novo
}

// Capitaliza a primeira letra não-espaço
const capFirst = (s: string) => {
  const i = s.search(/\S/)
  if (i === -1) return ""
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}

export default function RegistrarPage() {
  const [bloco, setBloco] = useState("")
  const [apartamento, setApartamento] = useState("")
  const [morador, setMorador] = useState("")
  const [empresa, setEmpresa] = useState("")
  const [empresaIsOutro, setEmpresaIsOutro] = useState(false) // novo
  const [showAlert, setShowAlert] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // novo estado para o nome de quem recebeu
  const [recebidoPor, setRecebidoPor] = useState("") // mantém vazio ao carregar

  const blocos = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

  const apartamentos = ["01", "02", "03", "04", "11", "12", "13", "14", "21", "22", "23", "24", "31", "32", "33", "34"]

  const empresas = ["Correios", "Jadlog", "Rodonaves", "Mercado Livre", "Amazon", "Outra empresa"]

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
    setCurrentUser(user)
    setIsAdmin(localStorage.getItem("userType") === "admin")
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!bloco || !apartamento || !morador || !empresa) {
      alert("Por favor, preencha todos os campos")
      return
    }

    const nomeRecebedor = recebidoPor.trim()

    const novaEncomenda: Encomenda = {
      id: Date.now().toString(),
      bloco,
      apartamento,
      morador: capFirst(morador.trim()), // Aplica capitalização
      empresa: capFirst(empresa.trim()), // mantém capitalização
      dataRecebimento: new Date().toLocaleString("pt-BR"),
      status: `Recebido por ${nomeRecebedor}`, // usa o campo digitado
      isNew: true,
      recebidoPor: capFirst(nomeRecebedor), // persiste no objeto e aplica capitalização
    }

    // Salvar no localStorage para simular persistência
    const encomendas = JSON.parse(localStorage.getItem("encomendas") || "[]")
    encomendas.unshift(novaEncomenda)
    localStorage.setItem("encomendas", JSON.stringify(encomendas))

    // Mostrar confirmação
    setShowAlert(true)

    // Limpar formulário (inclui o campo Recebido por)
    setBloco("")
    setApartamento("")
    setMorador("")
    setEmpresa("")
    setEmpresaIsOutro(false) // reset do modo "Outros"
    setRecebidoPor("") // deixa em branco após salvar

    // Esconder alerta após 3 segundos
    setTimeout(() => setShowAlert(false), 3000)
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
            <h1>Registrar Encomenda</h1>
            <p>Preencha os dados da encomenda recebida</p>
          </div>

          {showAlert && (
            <div className="alert success">
              ✅ Encomenda registrada com sucesso! O morador será notificado.
              <br />
              <small>Recebido por {recebidoPor.trim()}</small> {/* mostra o digitado */}
            </div>
          )}

          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Bloco</label>
                  <select className="form-select" value={bloco} onChange={(e) => setBloco(e.target.value)} required>
                    <option value="">Selecione o bloco</option>
                    {blocos.map((b) => (
                      <option key={b} value={b}>
                        Bloco {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Apartamento</label>
                  <select
                    className="form-select"
                    value={apartamento}
                    onChange={(e) => setApartamento(e.target.value)}
                    required
                  >
                    <option value="">Selecione o apartamento</option>
                    {apartamentos.map((apt) => (
                      <option key={apt} value={apt}>
                        Apt {apt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nome do Morador */}
              <div className="form-group">
                <label className="form-label">Nome do Morador</label>
                <input
                  type="text"
                  className="form-input"
                  value={morador}
                  onChange={(e) => setMorador(capFirst(e.target.value))} // <- aplica capitalização
                  placeholder="Ex.: Maria Silva"
                  required
                />
              </div>

              {/* Empresa de Entrega */}
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select
                  className="form-select"
                  value={empresaIsOutro ? "Outra empresa" : empresa}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "Outra empresa") {
                      setEmpresaIsOutro(true)
                      setEmpresa("") // passa a digitar no input abaixo
                    } else {
                      setEmpresaIsOutro(false)
                      setEmpresa(v)
                    }
                  }}
                  required
                >
                  <option value="">Selecione a empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo aparece só quando selecionar "Outros" */}
              {empresaIsOutro && (
                <div className="form-group">
                  <label className="form-label">Outra empresa</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa}
                    onChange={(e) => setEmpresa(capFirst(e.target.value))}
                    placeholder="Digite o nome da empresa"
                    required
                  />
                </div>
              )}

              {/* Campo novo: Recebido por */}
              <div className="form-group">
                <label className="form-label">Recebido por</label>
                <input
                  type="text"
                  className="form-input"
                  value={recebidoPor}
                  onChange={(e) => setRecebidoPor(capFirst(e.target.value))} // <- aplica capitalização
                  placeholder="Nome de quem recebeu a encomenda"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary">
                📦 Registrar Encomenda
              </button>
            </form>
          </div>
        </div>

        <nav className="nav-menu">
          <Link href="/" className="nav-item">
            <div className="nav-icon">🏠</div>
            Início
          </Link>

          {isAdmin ? (
            <>
              <Link href="/registrar" className="nav-item active">
                <div className="nav-icon">📦</div>
                Registrar
              </Link>
              <Link href="/historico" className="nav-item">
                <div className="nav-icon">📊</div>
                Histórico
              </Link>
            </>
          ) : (
            <>
              <Link href="/encomendas" className="nav-item">
                <div className="nav-icon">📋</div>
                Encomendas
              </Link>
            </>
          )}
        </nav>
      </div>
    </>
  )
}


