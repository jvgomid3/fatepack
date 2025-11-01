# Relatório de Segurança - FatePack

## ✅ Correções Implementadas

### 1. ⚠️ CRÍTICO - `/api/retiradas` POST sem autenticação
**Status**: ✅ **CORRIGIDO**

**Problema**: 
- Qualquer pessoa podia confirmar retiradas de encomendas sem autenticação
- Endpoint POST estava público por "minimal-change compatibility"

**Solução**:
- Adicionado `getUserFromRequest(req)` para validar JWT
- Validação de role: apenas `admin`, `porteiro` ou `síndico` podem confirmar retiradas
- Retorna 401 se não autenticado, 403 se role insuficiente

**Arquivo**: `app/api/retiradas/route.ts` (linhas 43-52)

---

### 4. ⚠️ ALTO - Console.log expondo dados sensíveis
**Status**: ✅ **CORRIGIDO**

**Problema**:
- `/api/login` logava identificadores de usuário e metadados de autenticação no stdout
- Logs são visíveis em produção e podem vazar informações sensíveis

**Solução**:
- Removidos 3 `console.log()` que expunham:
  - Linha 18: payload com identifier e passwordExists
  - Linha 44: resultado do Supabase com email/nome/senha
  - Linha 63: resultado da comparação bcrypt

**Arquivo**: `app/api/login/route.ts`

---

### 5. ⚠️ ALTO - Error messages detalhados expondo estrutura do banco
**Status**: ✅ **CORRIGIDO**

**Problema**:
- Mensagens de erro retornavam `e.message` completa, revelando nomes de tabelas, colunas e estrutura SQL
- Exemplo: `"duplicate key value violates unique constraint usuario_email_key"` expõe nome da constraint

**Solução**:
- Criado helper `lib/server/errorHandler.ts` com:
  - `safeErrorMessage(error)`: retorna mensagem genérica em produção, detalhada em dev
  - `createErrorResponse(error, status)`: cria resposta padronizada
- Aplicado em 10+ rotas:
  - `/api/login`
  - `/api/moradores` (GET, POST, PUT, DELETE)
  - `/api/encomendas` (GET, POST)
  - `/api/retiradas` (GET, POST)

**Arquivos**: 
- `lib/server/errorHandler.ts` (criado)
- `app/api/*/route.ts` (múltiplos arquivos atualizados)

---

### 6. ⚡ MÉDIO - Input validation fraca
**Status**: ✅ **PARCIALMENTE CORRIGIDO**

**Problema**:
- Endpoints aceitavam inputs sem validação de tamanho/formato
- Risco de buffer overflow, SQL injection em queries dinâmicas

**Solução**:
- Implementado validação em `/api/encomendas` POST como **exemplo**:
  - `empresa`: máximo 100 caracteres
  - `bloco`/`apartamento`: devem ser numéricos
  - `nome`: máximo 200 caracteres
- **TODO**: Aplicar validação similar em outras rotas (`/api/moradores`, `/api/usuario`, etc.)

**Arquivo**: `app/api/encomendas/route.ts` (linhas 167-185)

**Próximos passos**:
- Considerar usar biblioteca Zod para validação estruturada
- Aplicar validação em todas as rotas POST/PUT

---

### 7. ⚡ MÉDIO - Falta rate limiting
**Status**: 📄 **DOCUMENTADO (aguardando implementação)**

**Problema**:
- Sem proteção contra brute force em `/api/login`
- Username enumeration em `/api/usuario?checkOnly` sem limite
- Risco de DoS em endpoints públicos

**Solução**:
- Criado guia completo em `docs/RATE_LIMITING.md` com:
  - 3 opções de implementação (Upstash/Vercel, custom Map, middleware)
  - Endpoints prioritários com limites recomendados
  - Código de exemplo pronto para usar
  - Checklist de implementação

**Arquivo**: `docs/RATE_LIMITING.md` (criado)

**Próximos passos**:
- Criar conta no Upstash (recomendado para produção)
- Instalar `@upstash/ratelimit` e `@upstash/redis`
- Implementar rate limit em 4 endpoints prioritários

---

### 8. ℹ️ BAIXO - CORS não configurado
**Status**: ✅ **CORRIGIDO**

**Problema**:
- Sem headers CORS configurados, permitindo acesso de qualquer origem
- Falta de headers de segurança básicos (X-Frame-Options, X-Content-Type-Options)

**Solução**:
- Adicionado `async headers()` no `next.config.mjs` com:
  - **CORS**: `Access-Control-Allow-Origin` (localhost em dev, domain em prod)
  - **Security headers**:
    - `X-Content-Type-Options: nosniff` (previne MIME sniffing)
    - `X-Frame-Options: DENY` (previne clickjacking)
    - `X-XSS-Protection: 1; mode=block` (ativa proteção XSS)
  - Métodos permitidos: GET, POST, PUT, DELETE, PATCH
  - Headers permitidos: Authorization, Content-Type, X-Requested-With

**Arquivo**: `next.config.mjs` (linhas 29-66)

**Configuração necessária**:
- Adicionar `NEXT_PUBLIC_APP_URL` no `.env` para produção (ex: `https://fatepack.vercel.app`)

---

## ⏳ Correções NÃO Implementadas (Aguardando Decisão)

### 2. ⚠️ CRÍTICO - JWT_SECRET com fallback hardcoded
**Status**: ⏳ **PENDENTE**

**Motivo não implementado**: 
- Usuário escolheu não executar esta correção no momento
- Requer decisão se quer validar na inicialização ou manter fallback

**Risco**: 
- Se `.env` não existir, secret padrão `"FatePackDevSecret123!"` será usado
- Atacante pode gerar tokens válidos se descobrir o secret hardcoded

**Como corrigir**:
```typescript
// lib/server/auth.ts
export const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required")
}
```

---

### 3. ⚠️ ALTO - Senha padrão "1234" hardcoded
**Status**: ⏳ **PENDENTE**

**Motivo não implementado**: 
- Usuário escolheu não executar esta correção no momento
- Requer decisão sobre como distribuir senhas aleatórias (email, SMS, primeiro acesso)

**Risco**: 
- Novos usuários criados em `/api/moradores` POST recebem senha "1234"
- Atacante pode acessar contas recém-criadas antes do usuário trocar a senha

**Como corrigir**:
```typescript
import crypto from 'crypto'

// Opção 1: Senha aleatória forte (requer envio por email/SMS)
const defaultPassword = crypto.randomBytes(16).toString('hex')

// Opção 2: Forçar definição de senha no primeiro login
const defaultPassword = null // usuário define ao fazer primeiro acesso
```

---

## 📊 Resumo de Segurança

| Item | Severidade | Status | Arquivo Principal |
|------|-----------|--------|-------------------|
| `/api/retiradas` POST sem auth | 🚨 CRÍTICO | ✅ Corrigido | `app/api/retiradas/route.ts` |
| JWT_SECRET hardcoded | 🚨 CRÍTICO | ⏳ Pendente | `lib/server/auth.ts` |
| Senha padrão "1234" | ⚠️ ALTO | ⏳ Pendente | `app/api/moradores/route.ts` |
| Console.log sensível | ⚠️ ALTO | ✅ Corrigido | `app/api/login/route.ts` |
| Error messages detalhados | ⚠️ ALTO | ✅ Corrigido | `lib/server/errorHandler.ts` |
| Input validation fraca | ⚡ MÉDIO | 🔄 Parcial | `app/api/encomendas/route.ts` |
| Falta rate limiting | ⚡ MÉDIO | 📄 Documentado | `docs/RATE_LIMITING.md` |
| CORS não configurado | ℹ️ BAIXO | ✅ Corrigido | `next.config.mjs` |

**Legenda**:
- ✅ Corrigido
- 🔄 Parcialmente implementado
- 📄 Documentado (aguarda implementação)
- ⏳ Pendente (decisão do usuário)

---

## 🔒 Recomendações Adicionais

### Curto Prazo (1-2 dias)
1. **URGENTE**: Corrigir JWT_SECRET hardcoded antes de deploy em produção
2. **URGENTE**: Implementar rate limiting em `/api/login` (evita brute force)
3. Substituir senha padrão "1234" por senha aleatória
4. Configurar `NEXT_PUBLIC_APP_URL` no `.env` de produção

### Médio Prazo (1 semana)
1. Adicionar validação de inputs em todas as rotas POST/PUT
2. Implementar refresh token (atual expira em 30 dias - muito longo)
3. Adicionar logging estruturado (ex: Winston, Pino) em vez de console.log
4. Criar endpoint `/api/auth/logout` que invalida token (blacklist)

### Longo Prazo (1 mês)
1. Migrar para Zod para validação de schemas
2. Adicionar testes automatizados de segurança (OWASP ZAP, Burp Suite)
3. Implementar 2FA para usuários admin
4. Audit log de ações críticas (criação de usuários, confirmação de retiradas)

---

## 📝 Checklist de Deploy em Produção

Antes de fazer deploy, certifique-se de:

- [ ] `JWT_SECRET` definido no `.env` (sem usar fallback)
- [ ] `NEXT_PUBLIC_APP_URL` configurado com domínio real
- [ ] Rate limiting implementado em pelo menos `/api/login`
- [ ] Todos os `console.log` removidos ou usando logger apropriado
- [ ] Variáveis de ambiente validadas no startup
- [ ] Testes de segurança executados (ver seção abaixo)

---

## 🧪 Testes de Segurança Recomendados

### 1. Testar proteção de retiradas
```bash
# Deve retornar 401 (sem token)
curl -X POST http://localhost:3000/api/retiradas \
  -H "Content-Type: application/json" \
  -d '{"id_encomenda":1,"nome_retirou":"Hacker"}'
```

### 2. Testar error messages genéricos
```bash
# Deve retornar mensagem genérica (não expor DB details)
curl -X POST http://localhost:3000/api/moradores \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@@@@","nome":"Test"}'
```

### 3. Testar CORS headers
```bash
# Deve incluir Access-Control-Allow-Origin e security headers
curl -I http://localhost:3000/api/login
```

---

**Última atualização**: 2025-11-01  
**Próxima revisão recomendada**: Antes de deploy em produção
