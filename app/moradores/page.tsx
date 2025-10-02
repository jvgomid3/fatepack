"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { History, LogOut, Package, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Morador = {
  nome: string
  email: string
  telefone?: string
  tipo?: string
  bloco?: string
  apartamento?: string
}

export default function MoradoresPage() {
  const router = useRouter()

  const logout = () => {
    try {
      localStorage.removeItem("userType")
      localStorage.removeItem("userName")
      localStorage.removeItem("userBlock")
      localStorage.removeItem("userApartment")
      localStorage.removeItem("currentUser")
      localStorage.removeItem("user")
    } catch {}
    router.replace("/")
  }

  // Gate por e-mail (não por tipo). Só deixa entrar se email === "adm" ou "admin"
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [emailUser, setEmailUser] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("Administrador")

  useEffect(() => {
    const email = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim().toLowerCase()
    const current = JSON.parse(localStorage.getItem("currentUser") || "{}")
    const name = current?.name || current?.nome || localStorage.getItem("userName") || "Administrador"
    setDisplayName(String(name))
    setEmailUser(email)
    if (email === "adm") {
      setAllowed(true)
    } else {
      setAllowed(false)
      router.replace("/inicio-admin")
    }
  }, [router])

  // UI state
  const containerRef = useRef<HTMLDivElement | null>(null)
  const backLinkRef = useRef<HTMLAnchorElement | null>(null)
  const helloRef = useRef<HTMLSpanElement | null>(null)
  const [navDims, setNavDims] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useEffect(() => {
    // força cor azul primária para a saudação
    if (helloRef.current) {
      helloRef.current.style.color = "var(--primary, #06b6d4)"
    }
  }, [])

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

  // CRUD state
  const [tab, setTab] = useState<"cadastrar" | "buscar">("cadastrar")
  const [searchEmail, setSearchEmail] = useState("")
  const [searchNome, setSearchNome] = useState("")
  const [searchBloco, setSearchBloco] = useState("")
  const [searchApto, setSearchApto] = useState("")
  const [results, setResults] = useState<Morador[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [msg, setMsg] = useState<string>("")
  const [msgType, setMsgType] = useState<"success" | "warn" | "error" | null>(null)
  const [form, setForm] = useState<Morador>({ nome: "", email: "", telefone: "", tipo: "", bloco: "", apartamento: "" })
  const [isEditing, setIsEditing] = useState(false)
  const [originalEmail, setOriginalEmail] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTargetEmail, setDeleteTargetEmail] = useState<string | null>(null)

  // helpers: mask telefone
  const formatPhone = (v: string) => {
    const digits = (v || "").replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
      // (99) 9999-9999
      const p1 = digits.slice(0, 2)
      const p2 = digits.slice(2, 6)
      const p3 = digits.slice(6, 10)
      if (!p2) return p1 ? `(${p1}` : ""
      if (!p3) return `(${p1}) ${p2}`
      return `(${p1}) ${p2}-${p3}`
    }
    // 11 digits: (99) 99999-9999
    const p1 = digits.slice(0, 2)
    const p2 = digits.slice(2, 7)
    const p3 = digits.slice(7, 11)
    if (!p3) return `(${p1}) ${p2}`
    return `(${p1}) ${p2}-${p3}`
  }

  const handleSearch = async () => {
    setMsg("")
    setMsgType(null)
    setResults([])
    try {
      const params = new URLSearchParams()
      if (searchEmail) params.set("email", searchEmail)
      if (searchNome) params.set("nome", searchNome)
      if (searchBloco) params.set("bloco", searchBloco)
      if (searchApto) params.set("apartamento", searchApto)
      const qs = params.toString()
      if (!qs) { setMsg("Informe pelo menos um filtro para buscar."); setMsgType("warn"); setHasSearched(false); return }
      setHasSearched(true)
      const r = await fetch(`/api/moradores?${qs}`)
      const j = await r.json().catch(() => null)
      if (!r.ok) { setMsg(j?.error || "Falha na busca"); setMsgType("error"); return }
      setResults(Array.isArray(j?.items) ? j.items : [])
    } catch {
      setMsg("Falha ao buscar moradores.")
      setMsgType("error")
    }
  }

  // helpers: capitalize first letter of each word (supports hyphenated names)
  const capFirst = (s: string) => {
    const toTitle = (w: string) => (
      w ? w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1) : w
    )
    return (s || "")
      .toLowerCase()
      .split(/(\s+)/)
      .map((tok) => (tok.trim() === "" ? tok : tok.split("-").map(toTitle).join("-")))
      .join("")
  }

  const onCreate = async () => {
    setMsg("")
    setMsgType(null)
    try {
      const telDigits = (String(form.telefone || "").match(/\d+/g) || []).join("")
      const payload = {
        nome: String(form.nome || "").trim(),
        email: String(form.email || "").trim().toLowerCase(),
        telefone: telDigits || undefined,
        tipo: String(form.tipo || "").trim() || undefined,
        bloco: String(form.bloco || "").trim() || undefined,
        apartamento: String(form.apartamento || "").trim() || undefined,
      }
      if (!payload.nome || !payload.email) {
        setMsg("Nome e e-mail são obrigatórios.")
        setMsgType("warn")
        return
      }
      const r = await fetch("/api/moradores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        if (j?.error === "EMAIL_JA_CADASTRADO") {
          setMsg("E-mail já cadastrado para outro usuário.")
          setMsgType("error")
        } else {
          setMsg(j?.detail ? `Falha ao criar: ${j.detail}` : (j?.error || "Falha ao criar"))
          setMsgType("error")
        }
        return
      }
      setMsg("Morador cadastrado com sucesso.")
      setMsgType("success")
      setForm({ nome: "", email: "", telefone: "", tipo: "", bloco: "", apartamento: "" })
    } catch {
      setMsg("Erro ao criar morador.")
      setMsgType("error")
    }
  }

  const onUpdate = async () => {
    setMsg("")
    setMsgType(null)
    try {
      const payload = {
        nome: String(form.nome || "").trim(),
        email: String(form.email || "").trim().toLowerCase(),
        telefone: String(form.telefone || "").trim(),
        tipo: String(form.tipo || "").trim() || undefined,
        bloco: String(form.bloco || "").trim() || undefined,
        apartamento: String(form.apartamento || "").trim() || undefined,
      }
      if (!payload.email && !originalEmail) { setMsg("E-mail é obrigatório para atualizar"); return }
      const body = { ...payload, ...(originalEmail ? { originalEmail } : {}) }
      const r = await fetch("/api/moradores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        if (r.status === 409 || j?.error === "EMAIL_JA_CADASTRADO") {
          setMsg("E-mail já cadastrado para outro usuário.")
          setMsgType("error")
        } else {
          setMsg(j?.error || "Falha ao atualizar")
          setMsgType("error")
        }
        return
      }
      setMsg("Morador atualizado com sucesso.")
      setMsgType("success")
      setIsEditing(false)
      setOriginalEmail(null)
      if (tab === "buscar" && hasSearched) {
        // Atualiza a lista se o usuário veio da aba de busca
        handleSearch()
      }
    } catch {
      setMsg("Erro ao atualizar morador.")
      setMsgType("error")
    }
  }

  const onDelete = async (emailToDelete?: string) => {
    const email = (emailToDelete || form.email || "").trim()
    if (!email) { setMsg("Informe o e-mail para excluir"); setMsgType("error"); return }
    setMsg("")
    setMsgType(null)
    try {
      const r = await fetch(`/api/moradores?email=${encodeURIComponent(email)}`, { method: "DELETE" })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        if (r.status === 404 || j?.error === "USUARIO_NAO_ENCONTRADO") {
          setMsg("Morador não encontrado para exclusão.")
        } else {
          setMsg(j?.error || "Falha ao excluir")
        }
        setMsgType("error");
        return }
      setMsg("Morador excluído com sucesso.")
      setMsgType("success")
      setConfirmOpen(false)
      setDeleteTargetEmail(null)
      // refresh list if on buscar
      if (tab === "buscar") handleSearch()
      // clear form if it was the same
      if (email === form.email) setForm({ nome: "", email: "", telefone: "", tipo: "", bloco: "", apartamento: "" })
      router.refresh?.()
    } catch {
      setMsg("Erro ao excluir morador.")
      setMsgType("error")
    }
  }

  const requestDelete = (emailToDelete: string) => {
    const email = (emailToDelete || "").trim()
    setDeleteTargetEmail(email)
    setConfirmOpen(true)
  }

  const blocos = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")), [])
  const apartamentos = useMemo(() => {
    const nums: string[] = []
    const pushRange = (start: number, end: number) => {
      for (let n = start; n <= end; n++) nums.push(String(n).padStart(2, "0"))
    }
    pushRange(1, 4)
    pushRange(11, 14)
    pushRange(21, 24)
    pushRange(31, 34)
    pushRange(41, 44)
    return nums
  }, [])

  if (allowed === false) return null
  if (allowed === null) return null

  return (
    <>
      <div className="container" ref={containerRef}>
        <div className="main-content">
          {/* Top bar com saudação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link href="/" className="back-link" ref={backLinkRef}>←] Sair</Link>
            <span ref={helloRef} className="hello-greeting" style={{ fontFamily: "inherit", fontWeight: 700 }}>
              Olá{displayName ? `, ${String(displayName)}` : " Administrador"}!
            </span>
          </div>

          <div className="header">
            <h1>Gestão de Moradores</h1>
            <p>Crie, busque, atualize e remova moradores</p>
          </div>

          {msg && (
            <div
              className={`alert ${msgType === "warn" ? "alert-warn" : ""} ${msgType === "success" ? "alert-success" : ""} ${msgType === "error" ? "alert-error" : ""}`}
              role="status"
            >
              {msgType === "warn" ? `⚠️ ${msg}` : msgType === "success" ? `✅ ${msg}` : msg}
            </div>
          )}

          {/* Tabs (Segmented control) */}
          <div className="tabs">
            <div className="segmented" role="tablist" aria-label="Alternar entre Cadastrar e Buscar">
              <button
                role="tab"
                aria-selected={tab === "cadastrar"}
                className={`seg-btn ${tab === "cadastrar" ? "active" : ""}`}
                onClick={() => setTab("cadastrar")}
              >
                Cadastrar
              </button>
              <button
                role="tab"
                aria-selected={tab === "buscar"}
                className={`seg-btn ${tab === "buscar" ? "active" : ""}`}
                onClick={() => setTab("buscar")}
              >
                Buscar
              </button>
            </div>
          </div>

          {tab === "buscar" && (
            <div className="card search-card">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="text" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="maria@exemplo.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input className="form-input" type="text" value={searchNome} onChange={(e) => setSearchNome(e.target.value)} placeholder="Maria Silva" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bloco</label>
                  <select className="form-select" value={searchBloco} onChange={(e) => setSearchBloco(e.target.value)}>
                    <option value="">Todos</option>
                    {blocos.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Apartamento</label>
                  <select className="form-select" value={searchApto} onChange={(e) => setSearchApto(e.target.value)}>
                    <option value="">Todos</option>
                    {apartamentos.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="actions-search">
                <button type="button" className="btn btn-primary" onClick={handleSearch}>Buscar</button>
                <button
                  type="button"
                  className="link-clear"
                  onClick={() => { setSearchEmail(""); setSearchNome(""); setSearchBloco(""); setSearchApto(""); setResults([]); setMsg(""); setHasSearched(false); }}
                  aria-label="Limpar filtros"
                >
                  Limpar Filtros
                </button>
              </div>

              {/* Lista de resultados */}
              <div className="results">
                {!hasSearched ? null : (
                  results.length === 0 && !msg ? (
                    <div className="empty">❌ Nenhum morador encontrado.</div>
                  ) : (
                    results.map((m, idx) => (
                      <div key={`${m.email}-${idx}`} className="result-item">
                        <div className="result-main">
                          <div className="result-name">{m.nome}</div>
                          <div className="result-sub">{m.email}</div>
                          <div className="result-sub">Bloco {m.bloco || "-"} • Apt {m.apartamento || "-"} • {m.tipo || "morador"}</div>
                          {m.telefone && <div className="result-sub">{formatPhone(m.telefone)}</div>}
                        </div>
                        <div className="result-actions">
                          <button
                            type="button"
                            className="btn btn-mini btn-atualizar"
                            onClick={() => { setForm({ ...m, telefone: formatPhone(m.telefone || "") }); setOriginalEmail(m.email); setIsEditing(true); setTab("cadastrar") }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-mini btn-deletar"
                            onClick={() => requestDelete(m.email)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          )}

          {tab === "cadastrar" && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className="form-input" type="text" value={form.nome}
                       onChange={(e) => setForm({ ...form, nome: capFirst(e.target.value) })}
                       placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={form.email}
                       onChange={(e) => setForm({ ...form, email: e.target.value })}
                       placeholder="email@exemplo.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" type="tel" value={form.telefone || ""}
                       onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                       placeholder="(99) 99999-9999" maxLength={16} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={form.tipo || ""}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="">Selecione o tipo</option>
                  <option value="morador">morador</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bloco</label>
                  <select className="form-select" value={form.bloco || ""} onChange={(e) => setForm({ ...form, bloco: e.target.value })}>
                    <option value="">Selecione</option>
                    {blocos.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Apartamento</label>
                  <select className="form-select" value={form.apartamento || ""} onChange={(e) => setForm({ ...form, apartamento: e.target.value })}>
                    <option value="">Selecione</option>
                    {apartamentos.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                {!isEditing && (
                  <button
                    type="button"
                    className="btn btn-crud btn-criar"
                    onClick={onCreate}
                    style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
                  >
                    Cadastrar
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                      type="button"
                      className="btn btn-crud btn-atualizar"
                      onClick={onUpdate}
                      style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
                    >
                      Atualizar
                    </button>
                    <button
                      type="button"
                      className="btn btn-crud btn-deletar"
                      onClick={() => requestDelete(originalEmail || form.email)}
                      style={{ padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      className="btn btn-mini"
                      onClick={() => { setIsEditing(false); setOriginalEmail(null); setForm({ nome: "", email: "", telefone: "", tipo: "", bloco: "", apartamento: "" }) }}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <nav
          id="moradores-nav"
          className="nav-menu nav-modern"
          style={{ left: 0, right: 0, transform: "none", width: "100%" }}
        >
          <Link href="/registrar" className="nav-item" title="Registrar">
            <Package className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Registrar</span>
          </Link>

          <Link href="/historico" className="nav-item" title="Histórico">
            <History className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Histórico</span>
          </Link>

          <Link href="/aviso" className="nav-item" title="Aviso">
            <AlertTriangle className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Aviso</span>
          </Link>

          <button type="button" className="nav-item" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut className="nav-icon-svg" aria-hidden="true" />
            <span className="nav-label">Sair</span>
          </button>
        </nav>
      </div>

      <style jsx>{`
        /* base */
  .nav-menu { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; z-index: 1000; padding-bottom: calc(env(safe-area-inset-bottom, 0px)); }
        .container { padding-bottom: 80px; }

        /* moderna com azul discreto */
        #moradores-nav.nav-modern {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: saturate(180%) blur(12px);
          -webkit-backdrop-filter: saturate(180%) blur(12px);
          border-top: 1px solid rgba(2, 132, 199, 0.10);
          box-shadow: 0 -6px 24px rgba(2, 132, 199, 0.12);
        }
        #moradores-nav .nav-item {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 7px 14px; margin: 6px 8px; border-radius: 12px;
          color: var(--muted-foreground);
          transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
        }
        #moradores-nav .nav-item:hover { background: rgba(59, 130, 246, 0.10); color: var(--foreground); }
        #moradores-nav .nav-item:active { transform: translateY(1px); }
        #moradores-nav .nav-item.active {
          background: linear-gradient(180deg, rgba(14, 165, 233, 0.20), rgba(59, 130, 246, 0.18));
          color: var(--foreground);
          border: 1px solid rgba(59, 130, 246, 0.30);
        }
        #moradores-nav .nav-icon-svg { width: 18px; height: 18px; }
        #moradores-nav .nav-label { font-weight: 700; font-size: 14px; letter-spacing: -0.2px; }

        /* força cor azul na saudação, evitando sobrescritas */
        .hello-greeting { color: var(--primary, #06b6d4) !important; }

        /* Base dos botões CRUD */
        .btn-crud { border: none !important; color: #fff !important; border-radius: 8px; }
        /* Cores dos botões CRUD (com !important para prevalecer) */
  .btn-criar { background-color: #0ea5e9 !important; border-color: #0284c7 !important; }
        .btn-atualizar  { background-color: #3b82f6 !important; border-color: #2563eb !important; }
        .btn-deletar   { background-color: #ef4444 !important; border-color: #dc2626 !important; }

        /* Link de limpar campos */
        .link-clear { background: transparent; border: none; color: #0ea5e9; cursor: pointer; font-size: 14px; padding: 0; }
        .link-clear:hover { text-decoration: underline; }

        /* Menor espaço abaixo do card de busca */
        .search-card { padding-bottom: 10px; }

        /* Tabs (segmented) */
        .tabs { display: flex; justify-content: center; margin: 12px 0 8px; }
        .segmented {
          display: inline-flex;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 4px;
          border-radius: 9999px;
          gap: 4px;
          box-shadow: 0 1px 2px rgba(2, 132, 199, 0.06);
        }
        .seg-btn {
          appearance: none;
          border: none;
          background: transparent;
          color: #0f172a;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: 9999px;
          cursor: pointer;
          transition: background .2s ease, color .2s ease, box-shadow .2s ease;
        }
        .seg-btn:hover { background: rgba(2, 132, 199, 0.08); }
        .seg-btn.active {
          background: var(--primary, #0ea5e9);
          color: #fff;
          box-shadow: 0 1px 0 #0284c7 inset, 0 1px 4px rgba(2, 132, 199, 0.25);
          border: 1px solid #0284c7;
        }

        /* Forms */
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }

  /* Alerts */
  .alert { margin: 10px auto 6px; padding: 10px 12px; border-radius: 12px; max-width: 680px; }
  .alert-warn { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
  .alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

  /* AlertDialog buttons */
  :global(.btn-delete-confirm) {
    background-color: #ef4444; /* red-500 */
    border: 1px solid #dc2626; /* red-600 */
    color: #fff;
  }
  :global(.btn-delete-confirm:hover) {
    background-color: #dc2626;
  }
  :global(.btn-cancel) {
    background-color: #f1f5f9; /* slate-100 */
    border: 1px solid #cbd5e1; /* slate-300 */
    color: #0f172a; /* slate-900 */
  }
  :global(.btn-cancel:hover) {
    background-color: #e2e8f0;
  }

        /* Primary button (Buscar) to set the reference blue in this page */
        .btn.btn-primary { background-color: #0ea5e9; border: 1px solid #0284c7; color: #fff; }
        .btn.btn-primary:hover { background-color: #0ca3e6; }

    /* Buscar actions */
    .actions-search { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 6px; }
    .actions-search .btn.btn-primary { min-width: 160px; }

        /* Results */
        .results { margin-top: 10px; display: grid; gap: 8px; }
        .result-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
        .result-main { display: grid; gap: 2px; }
        .result-name { font-weight: 700; color: #0f172a; }
        .result-sub { font-size: 13px; color: #475569; }
  .result-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    /* Make Editar blue like Buscar and force white text for both */
    .btn-mini.btn-atualizar { background-color: #0ea5e9; border: 1px solid #0284c7; color: #fff; }
    .btn-mini.btn-deletar { color: #fff; }
        .btn-mini { background: #e2e8f0; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 8px; font-weight: 600; }
        .results .empty {
          background: #fff1f2; /* rose-50 */
          border: 1px solid #fecdd3; /* rose-200 */
          color: #be123c; /* rose-700 */
          text-align: center;
          padding: 12px 14px;
          border-radius: 12px;
          font-weight: 400;
          box-shadow: 0 2px 10px rgba(190, 18, 60, 0.06);
          max-width: 520px;
          margin: 8px auto; /* centraliza horizontal */
        }
      `}</style>

      {/* Confirm deletion dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este morador?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetEmail && onDelete(deleteTargetEmail)}
              className="btn-delete-confirm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
