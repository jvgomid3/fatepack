"use client"

import { useState } from "react"
import { enablePushNotifications } from "../../lib/pushClient"

export default function DebugPushPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  return (
    <div style={{ padding: 16 }}>
      <h1>Debug Push</h1>
      <p>Use estes botões para verificar a inscrição e enviar um push de teste para o usuário atual.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button disabled={loading} onClick={async () => {
          setLoading(true)
          try {
            const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
            const res = await enablePushNotifications(getToken)
            const j = { action: 'sync', result: res }
            setResult(j)
          } finally {
            setLoading(false)
          }
        }}>Reinscrever/sincronizar assinatura</button>

        <button disabled={loading} onClick={async () => {
          setLoading(true)
          try {
            // Remove subscription from browser and server
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready
              const sub = await reg.pushManager.getSubscription()
              if (sub) {
                try {
                  const ep = sub.endpoint
                  await sub.unsubscribe().catch(() => {})
                  const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
                  if (ep) {
                    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(ep)}`, {
                      method: 'DELETE',
                      headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                    }).catch(() => {})
                  }
                } catch {}
              }
            }
            const res = await fetch('/api/push/test', { method: 'GET', cache: 'no-store' })
            const j = await res.json().catch(() => null)
            setResult({ action: 'unsubscribe', result: j })
          } finally {
            setLoading(false)
          }
        }}>Desinscrever e limpar</button>

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
      <ol style={{marginTop:12, color:'#475569'}}>
        <li>1) No iPhone, use o app instalado na Tela de Início (PWA), não o Safari aberto.</li>
        <li>2) Toque em "Reinscrever/sincronizar assinatura" para vincular sua inscrição ao usuário logado.</li>
        <li>3) Toque em "Listar inscrições (GET)"; deve mostrar count ≥ 1.</li>
        <li>4) Toque em "Enviar push de teste (POST)" e deixe o app em segundo plano por alguns segundos para ver a notificação.</li>
      </ol>
    </div>
  )
}
