"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function InicioPage() {
  const [userName, setUserName] = useState<string | null>(null)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [navDims, setNavDims] = useState({ left: 0, width: 0 })

  useEffect(() => {
    let mounted = true
    // marca que o componente já montou (evita flash)
    // garante chamada para /api/me na raiz (evita /inicio/api/me)
    fetch(window.location.origin + "/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (!mounted) return
        // usa "nome" do banco; fallback para "name"
        if (data?.nome) setUserName(String(data.nome))
        else if (data?.name) setUserName(String(data.name))
      })
      .catch(() => {
        /* fail silently for now */
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setNavDims({ left: r.left, width: r.width })
    }
    // measure now and on resize
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  return (
    <>
      <div className="container" ref={containerRef}>
        <div className="header" style={{ position: "relative" }}>
          <h1>Início</h1>
          <p>Bem-vindo à página inicial!</p>
          {/* {mounted && ( */}
          <div className="user-greeting" aria-hidden="true">
            Olá{userName ? `, ${String(userName).split(" ")[0]}` : ""}!
          </div>
          {/* )} */}
        </div>

        <div className="main-content">
          <div className="card">
            {/* Conteúdo idêntico à /encomendas, mas sem comboboxes/inputs */}
            <div style={{ padding: "1rem 0" }}>
              <p style={{ color: "var(--muted-foreground)", margin: 0 }}>
                Área para informações do usuário.
              </p>
            </div>

            <div style={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
              <span>Nome, e-mail, telefone e notificações.</span>
            </div>


          </div>
        </div>
        {/* Nav inferior: mostra apenas quando o usuário estiver logado */}
        {userName && (
          <nav
            id="inicio-nav"
            className="nav-menu"
            role="navigation"
            aria-label="Menu inferior"
            style={{
              left: "50%",                         // igual ao /encomendas
              transform: "translateX(-50%)",      // igual ao /encomendas
              width: navDims.width
                ? `${navDims.width}px`
                : "min(720px, calc(100% - 32px))", // mesmo fallback usado nas outras páginas
            }}
          >
            <button
              type="button"
              className="nav-item"
              onClick={async () => {
                try {
                  await fetch(window.location.origin + "/api/logout", { method: "POST", credentials: "include" })
                } catch (e) {
                  /* ignore */
                }
                router.push("/")
              }}
              title="Sair"
            >
              <div className="nav-icon" aria-hidden="true">↩️</div>
              Sair
            </button>

            <Link href="/encomendas" className="nav-item" title="Encomendas">
              <div className="nav-icon" aria-hidden="true">📋</div>
              Encomendas
            </Link>
          </nav>
         )}
       </div>

      <style jsx>{`
         .user-greeting {
           position: absolute;
           top: 8px;
           right: 0;
           color: var(--primary, #06b6d4);
           font-weight: 700;
           font-size: 14px;
           padding: 6px 8px;
         }
         @media (max-width: 520px) {
           .user-greeting { top: 6px; right: 8px; font-size: 16px; }
         }
      `}</style>

      {/* força estilos específicos para esta página (sobrescreve regras globais) */}
      <style jsx>{`
        #inicio-nav {
          position: fixed !important;
          bottom: 0px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: ${navDims.width ? `${navDims.width}px` : "min(720px, calc(100% - 32px))"} !important;
          z-index: 1000 !important;
        }
        /* mantém alinhamento/estilo dos itens como em /encomendas */
        #inicio-nav .nav-item { display: inline-flex; align-items: center; justify-content: center; }
      `}</style>
    </>
  )
}