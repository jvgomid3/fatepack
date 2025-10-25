import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister"

export const metadata: Metadata = {
  /* Updated metadata for FatePack branding */
  title: "FatePack",
  description: "Sistema para gerenciamento de encomendas em condomínios",
  applicationName: "FatePack",
  themeColor: "#06b6d4",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FatePack",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/placeholder-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/placeholder-logo.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS: fornecemos múltiplos tamanhos; todos apontam para o mesmo PNG do login
    apple: [
      { url: "/placeholder-logo.png", sizes: "120x120", type: "image/png" },
      { url: "/placeholder-logo.png", sizes: "152x152", type: "image/png" },
      { url: "/placeholder-logo.png", sizes: "167x167", type: "image/png" },
      { url: "/placeholder-logo.png", sizes: "180x180", type: "image/png" },
    ],
    // Keep the SVG as a regular favicon if desired; not used for app icon
    shortcut: "/favicon-package.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        {/* Registra o Service Worker para permitir instalação como app (PWA) */}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
