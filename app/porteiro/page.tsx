"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"

interface Package {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  data: string
}

const blocos = ["A", "B", "C", "D"]
const apartamentos = Array.from({ length: 20 }, (_, i) => (i + 101).toString())
const empresas = ["Correios", "Jadlog", "Rodonaves", "Mercado Livre", "Outros"]

export default function PorteiroPage() {
  const [bloco, setBloco] = useState("")
  const [apartamento, setApartamento] = useState("")
  const [morador, setMorador] = useState("")
  const [empresa, setEmpresa] = useState("")
  const [showAlert, setShowAlert] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!bloco || !apartamento || !morador || !empresa) {
      alert("Por favor, preencha todos os campos")
      return
    }

    const newPackage: Package = {
      id: Date.now().toString(),
      bloco,
      apartamento,
      morador,
      empresa,
      data: new Date().toLocaleString("pt-BR"),
    }

    // Salvar no localStorage para simular persistência
    const existingPackages = JSON.parse(localStorage.getItem("packages") || "[]")
    existingPackages.push(newPackage)
    localStorage.setItem("packages", JSON.stringify(existingPackages))

    // Resetar formulário
    setBloco("")
    setApartamento("")
    setMorador("")
    setEmpresa("")

    // Mostrar alerta de sucesso
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 3000)
  }

  return (
    <div className="container">
      <Link href="/" className="back-link">
        ← Voltar
      </Link>

      <div className="header">
        <h1>Registrar Encomenda</h1>
        <p>Preencha os dados da encomenda recebida</p>
      </div>

      {showAlert && <div className="alert">Encomenda registrada com sucesso!</div>}

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
            Registrar Encomenda
          </button>
        </form>
      </div>
    </div>
  )
}
