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
  const [quantidade, setQuantidade] = useState(50)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const enviarNotificacoes = async () => {
    setLoading(true)
    setResultado(null)

    try {
      const res = await fetch("/api/admin/send-test-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloco, apartamento, quantidade }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar notificações")
        return
      }

      setResultado(data)
      toast.success(data.message)
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar notificações")
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
            Popular Firebase Analytics com notificações de teste
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

          <div>
            <Label htmlFor="quantidade">Quantidade de Notificações</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              max="1000"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recomendado: 50-100 notificações. Aguarde ~1 minuto por notificação.
            </p>
          </div>

          <Button
            onClick={enviarNotificacoes}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Enviando..." : `Enviar ${quantidade} Notificações`}
          </Button>

          {loading && (
            <div className="text-center text-sm text-muted-foreground">
              ⏳ Enviando notificações... Isso pode levar alguns minutos.
            </div>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle>✅ Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Bloco/Apartamento:</strong> {resultado.detalhes.bloco}/
                {resultado.detalhes.apartamento}
              </p>
              <p>
                <strong>Usuários alcançados:</strong> {resultado.detalhes.usuarios}
              </p>
              <p>
                <strong>Notificações enviadas:</strong>{" "}
                {resultado.detalhes.notificacoes_enviadas}
              </p>
              <p>
                <strong>Total de sucessos:</strong>{" "}
                <span className="text-green-600 font-semibold">
                  {resultado.detalhes.total_sucessos}
                </span>
              </p>
              <p>
                <strong>Total de falhas:</strong>{" "}
                <span className="text-red-600 font-semibold">
                  {resultado.detalhes.total_falhas}
                </span>
              </p>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">📊 Firebase Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Aguarde 5-10 minutos e verifique os eventos no Firebase Console:
              </p>
              <a
                href="https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block mt-2"
              >
                🔗 Abrir Firebase Analytics →
              </a>
            </div>

            {resultado.logs && resultado.logs.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-sm">
                  📋 Logs detalhados ({resultado.logs.length} notificações)
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                  {resultado.logs.map((log: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-muted rounded">
                      <strong>#{log.numero}:</strong> {log.payload.title} →{" "}
                      <span className="text-green-600">{log.sucessos} ✓</span>{" "}
                      <span className="text-red-600">{log.falhas} ✗</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
