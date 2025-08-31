"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Encomenda {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  dataRecebimento: string
  status: string
  isNew: boolean
  recebidoPor: string // Added field to track who received the package
}

export default function RegistrarPage() {
  const [bloco, setBloco] = useState("")
  const [apartamento, setApartamento] = useState("")
  const [morador, setMorador] = useState("")
  const [empresa, setEmpresa] = useState("")
  const [showAlert, setShowAlert] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const blocos = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

  const apartamentos = ["01", "02", "03", "04", "11", "12", "13", "14", "21", "22", "23", "24", "31", "32", "33", "34"]

  const empresas = ["Correios", "Jadlog", "Rodonaves", "Mercado Livre", "Amazon", "Outros"]

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}")
    setCurrentUser(user)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!bloco || !apartamento || !morador || !empresa) {
      alert("Por favor, preencha todos os campos")
      return
    }

    // Simular salvamento da encomenda
    const novaEncomenda: Encomenda = {
      id: Date.now().toString(),
      bloco,
      apartamento,
      morador,
      empresa,
      dataRecebimento: new Date().toLocaleString("pt-BR"),
      status: `Recebido por ${currentUser?.email || "admin"}`,
      isNew: true,
      recebidoPor: currentUser?.email || "admin", // Added who received the package
    }

    // Salvar no localStorage para simular persistência
    const encomendas = JSON.parse(localStorage.getItem("encomendas") || "[]")
    encomendas.unshift(novaEncomenda)
    localStorage.setItem("encomendas", JSON.stringify(encomendas))

    // Mostrar confirmação
    setShowAlert(true)

    // Limpar formulário
    setBloco("")
    setApartamento("")
    setMorador("")
    setEmpresa("")

    // Esconder alerta após 3 segundos
    setTimeout(() => setShowAlert(false), 3000)
  }

  return (
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
            <small>Recebido por {currentUser?.email || "admin"}</small>
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

            <div className="form-group">
              <label className="form-label">Nome do Morador</label>
              <input
                type="text"
                className="form-input"
                value={morador}
                onChange={(e) => setMorador(e.target.value)}
                placeholder="Digite o nome do morador"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Empresa de Entrega</label>
              <select className="form-select" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required>
                <option value="">Selecione a empresa</option>
                {empresas.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
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
        <Link href="/registrar" className="nav-item active">
          <div className="nav-icon">📦</div>
          Registrar
        </Link>
        <Link href="/encomendas" className="nav-item">
          <div className="nav-icon">📋</div>
          Encomendas
        </Link>
        <Link href="/historico" className="nav-item">
          <div className="nav-icon">📊</div>
          Histórico
        </Link>
      </nav>
    </div>
  )
}
