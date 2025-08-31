"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Package {
  id: string
  bloco: string
  apartamento: string
  morador: string
  empresa: string
  data: string
}

export default function MoradorPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [hasNewPackage, setHasNewPackage] = useState(false)

  useEffect(() => {
    // Carregar encomendas do localStorage
    const loadPackages = () => {
      const storedPackages = JSON.parse(localStorage.getItem("packages") || "[]")

      // Verificar se há novas encomendas
      if (storedPackages.length > packages.length) {
        setHasNewPackage(true)
        setTimeout(() => setHasNewPackage(false), 5000)
      }

      setPackages(storedPackages)
    }

    loadPackages()

    // Verificar por novas encomendas a cada 3 segundos
    const interval = setInterval(loadPackages, 3000)

    return () => clearInterval(interval)
  }, [packages.length])

  const getCompanyIcon = (empresa: string) => {
    const icons: { [key: string]: string } = {
      Correios: "📮",
      Jadlog: "📦",
      Rodonaves: "🚚",
      "Mercado Livre": "🛒",
      Outros: "📋",
    }
    return icons[empresa] || "📦"
  }

  return (
    <div className="container">
      <Link href="/" className="back-link">
        ← Voltar
      </Link>

      <div className="header">
        <h1>
          Minhas Encomendas
          {hasNewPackage && <span className="badge">Nova!</span>}
        </h1>
        <p>Acompanhe suas encomendas recebidas</p>
      </div>

      {hasNewPackage && <div className="alert">🎉 Nova encomenda recebida!</div>}

      {packages.length === 0 ? (
        <div className="empty-state">
          <p>📭</p>
          <p>Nenhuma encomenda registrada ainda.</p>
        </div>
      ) : (
        <div>
          {packages.map((pkg) => (
            <div key={pkg.id} className="package-card">
              <h3>
                {getCompanyIcon(pkg.empresa)} {pkg.empresa}
              </h3>
              <p>
                <strong>Morador:</strong> {pkg.morador}
              </p>
              <p>
                <strong>Local:</strong> Bloco {pkg.bloco}, Apt {pkg.apartamento}
              </p>
              <p>
                <strong>Recebido em:</strong> {pkg.data}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
