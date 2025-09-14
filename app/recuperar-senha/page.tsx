"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RecuperarSenhaPage() {
  const router = useRouter()
  // logout local
  const logout = () => {
    try {
      localStorage.removeItem("userType")
      localStorage.removeItem("userName")
      localStorage.removeItem("userBlock")
      localStorage.removeItem("userApartment")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("user")
    } catch {}
    // replace so user cannot go back to protected pages
    router.replace("/")
    // ensure full reload if any in-memory state remains
    setTimeout(() => window.location.replace("/"), 100)
  }

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [block, setBlock] = useState("")
  const [apartment, setApartment] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [step, setStep] = useState<"verify" | "reset">("verify")
  const [error, setError] = useState("")
  // derived helper: true quando ambos preenchidos e iguais
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword

  // layout refs (mesma lógica do /registrar para nav width)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const backLinkRef = useRef<HTMLAnchorElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

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

  useEffect(() => {
    // iguala cor do "Olá, Administrador!" ao link "Voltar ao início"
    const linkEl = backLinkRef.current || (document.querySelector(".back-link") as HTMLAnchorElement | null)
    if (linkEl && helloRef.current) {
      const cs = window.getComputedStyle(linkEl)
      helloRef.current.style.color = cs.color
    }
  }, [])

  // normaliza telefone para comparar apenas dígitos
  const normPhone = (s = "") => (s || "").toString().replace(/\D/g, "")

  // normaliza identificadores (bloco/apartamento): remove não-dígitos e zeros à esquerda
  const normId = (s = "") => {
    const d = (s || "").toString().replace(/\D/g, "")
    return d.replace(/^0+/, "") || d // se tudo zeros, retorna d (possível "0")
  }

  // valida diretamente no banco via API /api/usuarios
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !phone || !block || !apartment) {
      setError("Preencha todos os campos para verificação")
      return
    }

    try {
      const qEmail = String(email).trim()
      const res = await fetch(`/api/usuarios?email=${encodeURIComponent(qEmail)}`, { cache: "no-store", headers: { Accept: "application/json" } })

      // tenta pegar body mesmo quando não ok
      let body: any = null
      try { body = await res.clone().json() } catch { body = await res.text().catch(() => null) }

      if (!res.ok) {
        console.debug("recuperar-senha: api /api/usuarios response", res.status, body)
        const msg = (body && typeof body === "object" && body.error) ? body.error : `Erro na consulta (${res.status})`
        setError(msg)
        return
      }

      const data = body && typeof body === "object" ? body : await res.json().catch(() => null)
      const user = data?.user
      if (!user) {
        console.debug("recuperar-senha: user not found in API body", data)
        setError("E-mail não encontrado")
        return
      }

      // usa a coluna telefone do DB
      const dbPhoneRaw = (user.telefone || "") as string
      const dbBlockRaw = (user.bloco || user.block || "") as string
      const dbAptoRaw = (user.apartamento || user.apto || user.apartment || "") as string

      if (!dbPhoneRaw || !dbBlockRaw || !dbAptoRaw) {
        console.debug("recuperar-senha: registro incompleto no DB", { dbPhoneRaw, dbBlockRaw, dbAptoRaw, user })
        setError("Registro incompleto no banco (telefone/bloco/apartamento ausentes). Contate o administrador.")
        return
      }

      const inputPhone = normPhone(phone)
      const dbPhone = normPhone(dbPhoneRaw)

      // match tolerante: igualdade ou sufixo (ignora DDI/zeros)
      const last = (s: string, n = 8) => (s || "").slice(-n)
      const phoneMatch =
        !!inputPhone &&
        !!dbPhone &&
        (inputPhone === dbPhone ||
          dbPhone.endsWith(inputPhone) ||
          inputPhone.endsWith(dbPhone) ||
          last(dbPhone, 8) === last(inputPhone, 8))

      const inputBlock = normId(block)
      const dbBlock = normId(dbBlockRaw)
      const blockMatch = inputBlock === dbBlock

      const inputApto = normId(apartment)
      const dbApto = normId(dbAptoRaw)
      const aptMatch = inputApto === dbApto

      console.debug("recuperar-senha: comparação", {
        inputPhone, dbPhone, phoneMatch,
        inputBlock, dbBlock, blockMatch,
        inputApto, dbApto, aptMatch,
      })

      if (phoneMatch && blockMatch && aptMatch) {
        setStep("reset")
      } else {
        setError("❌ Ops! As informações não coincidem com o e-mail informado.")
      }
    } catch (err) {
      console.error("recuperar-senha: erro handleVerify", err)
      setError("Falha ao verificar dados. Tente novamente.")
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!newPassword) {
      setError("Informe a nova senha")
      return
    }
    if (!confirmPassword) {
      setError("Confirme a nova senha")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    setIsResetLoading(true)
    try {
      const res = await fetch("/api/usuarios/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error || `Erro ao redefinir senha (${res.status})`)
        return
      }

      // sucesso: atualizou no banco (não redirecionar automaticamente)
      setSuccess("✅ Senha redefinida com sucesso!")
      setNewPassword("")
      setConfirmPassword("")
      // aguarda 1.2s e retorna ao login
    } catch (err) {
      console.error("reset error:", err)
      setError("Falha ao redefinir senha. Tente novamente.")
    } finally {
      setIsResetLoading(false)
    }
  }

  // formata telefone enquanto o usuário digita -> (11) 99999-9999 ou (11) 9999-9999
  const formatPhoneInput = (value: string) => {
    const d = (value || "").replace(/\D/g, "").slice(0, 11) // apenas dígitos, max 11
    if (!d) return ""
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  return (
    <>
      <div className="container" ref={containerRef}>
        <div className="main-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Link href="/" className="back-link" ref={backLinkRef}>← Sair</Link>
            <span ref={helloRef} style={{ fontWeight: 700 }}>Olá!</span>
          </div>

          {/* header fora do card (área cinza acima) */}
          <div className="header" style={{ maxWidth: 720, margin: "0 auto 1rem", paddingBottom: 8 }}>
            <h1 style={{ margin: 0 }}>Redefinir Senha</h1>
            <p style={{ margin: "0.5rem 0 0", color: "var(--muted-foreground)" }}>
              Informe os dados para validar a conta e redefinir sua senha
            </p>
          </div>

          <div className="card" style={{ maxWidth: 720 }}>
             {step === "verify" ? (
               <form onSubmit={handleVerify}>
                 <div className="form-group">
                   <label>E-mail:</label>
                   <input
                     id="email"
                     name="email"
                     type="email"
                     autoComplete="email"
                     placeholder="seu@email.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="form-input"
                     autoCapitalize="off"
                     spellCheck={false}
                     required
                   />
                 </div>

                 <div className="form-group">
                   <label>Telefone:</label>
                   <input
                     id="phone"
                     name="phone"
                     type="tel"
                     inputMode="tel"
                     autoComplete="tel"
                     placeholder="(11) 99999-9999"
                     value={phone}
                     onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                     className="form-input"
                     autoCapitalize="off"
                     spellCheck={false}
                     required
                   />
                 </div>

                 <div className="form-group">
                   <label>Bloco:</label>
                   <select value={block} onChange={(e) => setBlock(e.target.value)} className="form-select" required>
                     <option value="">Selecione o bloco</option>
                     <option value="01">Bloco 01</option>
                     <option value="02">Bloco 02</option>
                     <option value="03">Bloco 03</option>
                     <option value="04">Bloco 04</option>
                     <option value="05">Bloco 05</option>
                     <option value="06">Bloco 06</option>
                     <option value="07">Bloco 07</option>
                     <option value="08">Bloco 08</option>
                     <option value="09">Bloco 09</option>
                     <option value="10">Bloco 10</option>
                     <option value="11">Bloco 11</option>
                     <option value="12">Bloco 12</option>
                   </select>
                 </div>

                 <div className="form-group">
                   <label>Apartamento:</label>
                   <select value={apartment} onChange={(e) => setApartment(e.target.value)} className="form-select" required>
                     <option value="">Selecione o apartamento</option>
                     <option value="01">Apartamento 01</option>
                     <option value="02">Apartamento 02</option>
                     <option value="03">Apartamento 03</option>
                     <option value="04">Apartamento 04</option>
                     <option value="11">Apartamento 11</option>
                     <option value="12">Apartamento 12</option>
                     <option value="13">Apartamento 13</option>
                     <option value="14">Apartamento 14</option>
                     <option value="21">Apartamento 21</option>
                     <option value="22">Apartamento 22</option>
                     <option value="23">Apartamento 23</option>
                     <option value="24">Apartamento 24</option>
                     <option value="31">Apartamento 31</option>
                     <option value="32">Apartamento 32</option>
                     <option value="33">Apartamento 33</option>
                     <option value="34">Apartamento 34</option>
                   </select>
                 </div>

                 {error && <div className="alert" style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}

                 <button type="submit" className="btn btn-primary" style={{ marginTop: 12, width: "100%" }}>
                   Verificar dados
                 </button>
               </form>
             ) : (
               <form onSubmit={handleReset}>
                 <p style={{ marginTop: 0, marginBottom: "0.95rem", color: "var(--muted-foreground)" }}>
                   Defina a nova senha
                 </p>
                
                 <div className="form-group">
                   <label>Nova senha</label>
                   <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" required />
                 </div>
                
                 <div className="form-group">
                   <label>Confirme a nova senha</label>
                   <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" required />
                 </div>
 
                {/* mensagem de coincidência / discrepância (mostra quando o usuário digitou confirmação) */}
                {confirmPassword.length > 0 && (
                  <div className={passwordsMatch ? "pw-match" : "pw-mismatch"}>
                    {passwordsMatch ? "✅ As senhas coincidem." : "❌ As senhas não coincidem."}
                  </div>
                )}

                 {error && <div className="alert" style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}
                 {success && (
                  <div className="pw-match" style={{ marginTop: 8 }}>
                    <span>✅ {success}</span>
                  </div>
                )}
                 {success && (
                  <div style={{ marginTop: 15, textAlign: "center" }}>
                    <Link href="/" className="btn btn-primary login-btn">Fazer Login</Link>
                  </div>
                )}
 
                 <button
                   type="submit"
                   className={`btn btn-primary ${isResetLoading ? "btn-loading" : ""}`}
                   style={{ marginTop: 12, width: "100%", display: success ? "none" : undefined }}
                   disabled={isResetLoading}
                 >
                   {isResetLoading ? "Redefinindo..." : "Redefinir senha"}
                 </button>
               </form>
             )}
           </div>
         </div>

         <nav className="nav-menu" style={{ left: navDims.left, width: navDims.width, transform: "none" }}>
            <button
              type="button"
              className="nav-item"
              onClick={logout}
              aria-label="Sair"
              title="Sair"
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              <div className="nav-icon" aria-hidden="true">↩️</div>
              Sair
            </button>
          </nav>
       </div>
 
       <style jsx>{`
         .container {
           padding: 2rem;
           padding-bottom: 96px; /* reserva espaço para nav fixo */
           box-sizing: border-box;
         }
         .main-content { max-width: 720px; margin: 0 auto; }
         .card {
           background: var(--card, #fff);
           border: 1px solid #e5e7eb;
           border-radius: 12px;
           padding: 1.25rem;
           margin: 0 auto;
         }
         /* cabeçalho - fora do card, mesmo estilo de "Minhas Encomendas" */
         .header {
           margin-bottom: 1.5rem;
         }
         .header h1 {
           margin: 0;
           font-size: 24px; /* aumentado para ficar igual a Minhas Encomendas */
           font-weight: 700;
         }
         .header p {
           margin: 0.5rem 0 0;
           color: var(--muted-foreground);
           font-size: 15px; /* leve aumento */
         }

         /* layout dos campos: label e input lado a lado */
         .form-group {
           margin-bottom: 1rem; /* aumento de espaçamento entre campos */
           display: flex;
           align-items: center;
           gap: 16px; /* maior gap entre label e input */
         }
         /* reduzimos a largura da label para dar mais espaço ao input,
            mantendo o mesmo padding à direita do layout */
         .form-group label {
           width: 110px;
           min-width: 90px;
           font-size: 15px;
           font-weight: 400;
           padding-right: 8px;
           box-sizing: border-box;
           text-align: left;
         }
         /* inputs mais largos: ocupam quase toda a largura disponível,
            ficando "quase encostados" no fim (mesmo padding direito do card) */
         .form-input, .form-select {
           flex: 1 1 auto;
           padding: 14px 16px;
           border-radius: 8px;
           border: 1px solid #e2e8f0;
           font-size: 15px;
           box-sizing: border-box;
           max-width: calc(100% - 0px);
         }
         .btn { padding: 12px; border-radius: 8px; font-size: 15px; }

          .nav-menu {
            position: fixed;
            bottom: 12px; /* leve afastamento do fim da viewport para aparecer arredondamento */
            z-index: 1000;
            background: var(--card, #fff);
            border: 1px solid #e5e7eb;
            padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 6px);
            display: flex;
            gap: 6px;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 18px rgba(2,6,23,0.06);
            border-radius: 12px;        /* arredondado igual ao /historico */
            box-sizing: border-box;
         }
          .nav-item {
            display: inline-flex;
            gap: 8px;
            align-items: center;
            justify-content: center; /* garante ícone+texto centralizados */
            padding: 8px 12px;
            height: 44px; /* centraliza verticalmente */
            border-radius: 8px;
            color: var(--text);
            text-decoration: none;
            font-weight: 600;
          }
          .nav-icon {
            font-size: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .alert {
           margin-top: 8px;
           background: #fff1f6 !important;   /* rosinha claro */
           border: 1px solid #ef4444 !important; /* vermelho */
           color: #b91c1c !important;         /* texto vermelho */
           padding: 10px 12px;
           border-radius: 8px;
         }
         /* feedback de senhas */
         .pw-match {
           margin-top: 8px;
           background: #ecfdf5;       /* verde claro */
           border: 1px solid #10b981; /* verde */
           color: #065f46;            /* texto verde escuro */
           padding: 10px 12px;
           border-radius: 8px;
         }
         .pw-mismatch {
           margin-top: 8px;
           background: #fff1f6;       /* rosinha claro */
           border: 1px solid #ef4444; /* vermelho */
           color: #b91c1c;            /* texto vermelho */
           padding: 10px 12px;
           border-radius: 8px;
         }
+        /* link "Fazer Login" fora da caixinha (usa a cor do .back-link para ficar igual ao "Olá!") */
+        .login-link-outside {
+          display: inline-block; /* permite centralização por margin auto / text-align */
+          margin: 0 auto;
+          text-align: center;
+          font-weight: 700;
+          text-decoration: underline;
+          cursor: pointer;
+          color: inherit;
+          font-size: 20px; /* aumentado um pouco */
+          padding: 6px 0;
+        }
+        .login-link-outside:hover { opacity: 0.9; }
       `}</style>
+      <style jsx>{`
+        /* ...existing styles... */
+        .login-btn {
+          display: inline-block;
+          padding: 10px 22px;
+          background: linear-gradient(90deg, #06b6d4 0%, #0ea5e9 100%);
+          color: #fff !important;
+          border-radius: 10px;
+          font-weight: 700;
+          text-decoration: none;
+          font-size: 18px;
+          box-shadow: 0 8px 22px rgba(14,165,233,0.18);
+          transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
+        }
+        .login-btn:hover { transform: translateY(-2px); opacity: 0.98; }
+        .login-btn:active { transform: translateY(0); }
+      `}</style>
    </>
  )
}