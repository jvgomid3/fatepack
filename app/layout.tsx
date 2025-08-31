import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  /* Updated metadata for FatePack branding */
  title: "FatePack - Gerenciamento de Encomendas",
  description: "Sistema completo para gerenciamento de encomendas em condomínios",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
