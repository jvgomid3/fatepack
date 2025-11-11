"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function TestNotificationsPage() {
  const [bloco, setBloco] = useState("01")
  const [apartamento, setApartamento] = useState("01")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [contador, setContador] = useState(0)

  const enviarNotificacao = async () => {
    setLoading(true)
    setResultado(null)

    try {
      const res = await fetch("/api/admin/send-test-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloco, apartamento }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar notificação")
        setResultado(data)
        return
      }

      setResultado(data)
      setContador(prev => prev + 1)
      toast.success("✅ Notificação enviada!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar notificação")
      setResultado({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🧪 Enviar Notificações de Teste</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>
            Envia 1 notificação por vez. Clique múltiplas vezes para popular o Firebase Analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bloco">Bloco</Label>
              <Input
                id="bloco"
                value={bloco}
                onChange={(e) => setBloco(e.target.value)}
                placeholder="01"
              />
            </div>
            <div>
              <Label htmlFor="apartamento">Apartamento</Label>
              <Input
                id="apartamento"
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                placeholder="01"
              />
            </div>
          </div>

          <Button
            onClick={enviarNotificacao}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Enviando..." : `🔔 Enviar 1 Notificação ${contador > 0 ? `(${contador} enviadas)` : ''}`}
          </Button>

          {contador > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              📊 Total enviadas nesta sessão: <strong>{contador}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <Card className={resultado.error ? "border-red-500" : "border-green-500"}>
          <CardHeader>
            <CardTitle>{resultado.error ? "❌ Erro" : "✅ Resultado"}</CardTitle>
          </CardHeader>
          <CardContent>
            {resultado.error ? (
              <div className="space-y-2">
                <p className="text-red-600 font-semibold">{resultado.error}</p>
                {resultado.debug && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold">Ver detalhes do erro</summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                      {JSON.stringify(resultado.debug, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-green-600 font-semibold text-base">{resultado.message}</p>
                {resultado.detalhes && (
                  <>
                    <p>📍 <strong>Apartamento:</strong> Bloco {resultado.detalhes.apartamento.bloco} - {resultado.detalhes.apartamento.apartamento}</p>
                    <p>👥 <strong>Moradores:</strong> {resultado.detalhes.moradores}</p>
                    <p>🔔 <strong>Subscriptions:</strong> {resultado.detalhes.subscriptions}</p>
                    <p>✅ <strong>Sucessos:</strong> <span className="text-green-600 font-semibold">{resultado.detalhes.sucessos}</span></p>
                    <p>❌ <strong>Falhas:</strong> <span className="text-red-600 font-semibold">{resultado.detalhes.falhas}</span></p>
                    <p>🕐 <strong>Horário:</strong> {resultado.detalhes.timestamp}</p>
                    
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">📊 Firebase Analytics</h4>
                      <p className="text-muted-foreground">
                        Aguarde 5-10 minutos e verifique os eventos no console:
                      </p>
                      <a
                        href="https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline block mt-2"
                      >
                        🔗 Abrir Firebase Analytics →
                      </a>
                    </div>
                  </>
                )}
                {resultado.debug && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-semibold text-xs">📋 Ver debug completo</summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-64 text-xs">
                      {JSON.stringify(resultado, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
