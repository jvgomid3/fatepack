"use client"

import { useState } from "react"

export default function DebugPushPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  return (
    <div style={{ padding: 16 }}>
      <h1>Debug Push</h1>
      <p>Use estes botões para verificar a inscrição e enviar um push de teste para o usuário atual.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button disabled={loading} onClick={async () => {
          setLoading(true)
          try {
            const res = await fetch('/api/push/test', { method: 'GET', cache: 'no-store' })
            const j = await res.json().catch(() => null)
            setResult(j)
          } finally {
            setLoading(false)
          }
        }}>Listar inscrições (GET)</button>

        <button disabled={loading} onClick={async () => {
          setLoading(true)
          try {
            const res = await fetch('/api/push/test', { method: 'POST' })
            const j = await res.json().catch(() => null)
            setResult(j)
          } finally {
            setLoading(false)
          }
        }}>Enviar push de teste (POST)</button>
      </div>
      <pre style={{ marginTop: 16, background: '#f8fafc', padding: 12, borderRadius: 8, maxWidth: 800, whiteSpace: 'pre-wrap' }}>
        {result ? JSON.stringify(result, null, 2) : 'Sem resultados ainda.'}
      </pre>
    </div>
  )
}
