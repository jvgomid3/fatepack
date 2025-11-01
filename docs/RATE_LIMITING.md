# Rate Limiting - Guia de Implementação

## ⚠️ Status Atual
O projeto **NÃO** possui rate limiting implementado, o que permite que atacantes possam:
- Fazer brute force em `/api/login`
- Enumerar emails em `/api/usuario?checkOnly=true`
- Abusar de endpoints públicos como `/api/register`
- Sobrecarregar o servidor com requisições excessivas

## 🎯 Endpoints Prioritários para Rate Limiting

### 1. `/api/login` (CRÍTICO)
- **Limite sugerido**: 5 tentativas por 15 minutos por IP
- **Motivo**: Prevenir brute force de senhas
- **Action on limit**: Retornar 429 com mensagem "Muitas tentativas. Tente novamente em X minutos"

### 2. `/api/usuario?checkOnly=true` (ALTO)
- **Limite sugerido**: 10 requisições por minuto por IP
- **Motivo**: Prevenir username enumeration em massa
- **Action on limit**: Retornar 429

### 3. `/api/register` (ALTO)
- **Limite sugerido**: 3 registros por hora por IP
- **Motivo**: Prevenir spam de contas falsas
- **Action on limit**: Retornar 429

### 4. `/api/redefinir-senha` (MÉDIO)
- **Limite sugerido**: 3 tentativas por hora por email
- **Motivo**: Prevenir abuso de envio de emails
- **Action on limit**: Retornar 429

## 🛠️ Opções de Implementação

### Opção 1: Vercel Rate Limit (Recomendado se hospedado na Vercel)
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Criar em lib/server/ratelimit.ts
const redis = Redis.fromEnv()

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 req a cada 15min
  analytics: true,
})

// Usar em /api/login/route.ts
const ip = req.headers.get("x-forwarded-for") || "unknown"
const { success, reset } = await loginRateLimit.limit(ip)
if (!success) {
  return NextResponse.json(
    { error: "Muitas tentativas. Tente novamente mais tarde." },
    { status: 429, headers: { "X-RateLimit-Reset": reset.toString() } }
  )
}
```

**Requisitos**:
- Criar conta gratuita no [Upstash](https://upstash.com/)
- Instalar: `npm install @upstash/ratelimit @upstash/redis`
- Adicionar ao `.env`: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`

### Opção 2: Middleware Custom com Map em Memória (Simples, mas não escala)
```typescript
// lib/server/simpleRateLimit.ts
const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  const record = store.get(identifier)

  if (!record || now > record.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, resetAt: now + windowMs }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetAt: record.resetAt }
  }

  record.count++
  return { allowed: true, resetAt: record.resetAt }
}

// Usar em /api/login/route.ts
const ip = req.headers.get("x-forwarded-for") || "unknown"
const { allowed, resetAt } = checkRateLimit(ip, 5, 15 * 60 * 1000)
if (!allowed) {
  return NextResponse.json(
    { error: "Muitas tentativas. Tente novamente mais tarde." },
    { status: 429, headers: { "X-RateLimit-Reset": new Date(resetAt).toISOString() } }
  )
}
```

**Limitações**:
- ⚠️ Não funciona em ambientes serverless com múltiplas instâncias (memória não é compartilhada)
- ⚠️ Dados são perdidos ao reiniciar o servidor
- ✅ Útil para desenvolvimento ou deploys single-instance

### Opção 3: Middleware Global no Next.js (Requer Redis)
```typescript
// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 req/minuto globalmente
})

export async function middleware(request: NextRequest) {
  // Rate limit apenas em rotas sensíveis
  if (
    request.nextUrl.pathname.startsWith("/api/login") ||
    request.nextUrl.pathname.startsWith("/api/register")
  ) {
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
```

## 📋 Checklist de Implementação

- [ ] Escolher solução de rate limiting (Upstash recomendado para produção)
- [ ] Criar conta e configurar Redis (se usando Upstash/externa)
- [ ] Instalar dependências necessárias
- [ ] Adicionar variáveis de ambiente no `.env.local`
- [ ] Implementar rate limit em `/api/login` (CRÍTICO)
- [ ] Implementar rate limit em `/api/usuario?checkOnly` (ALTO)
- [ ] Implementar rate limit em `/api/register` (ALTO)
- [ ] Implementar rate limit em `/api/redefinir-senha` (MÉDIO)
- [ ] Testar localmente com múltiplas requisições
- [ ] Validar em staging antes de produção
- [ ] Monitorar logs de 429 após deploy

## 🧪 Como Testar

```bash
# Testar rate limit do /api/login (deve bloquear após 5 tentativas)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

Após a 6ª tentativa, deve retornar `429 Too Many Requests`.

## 📚 Recursos Adicionais

- [Upstash Rate Limiting Docs](https://upstash.com/docs/redis/features/ratelimiting)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Rate Limiting Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#rate-limiting)

---

**⚠️ IMPORTANTE**: Rate limiting deve ser implementado o mais rápido possível em produção. A ausência dessa proteção deixa o sistema vulnerável a ataques de força bruta e DoS.
