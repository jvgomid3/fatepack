# 📊 Como saber se notificação foi enviada (Next.js Web Push)

Este guia explica como verificar se suas notificações **enviadas pelo Next.js** (Web Push API) foram entregues com sucesso.

---

## 🎯 **Resumo Rápido**

**Você envia notificações pelo Next.js em 3 lugares:**
- 📦 `/api/encomendas` (POST) - Nova encomenda registrada
- 📢 `/api/aviso` (POST) - Avisos gerais
- 🧪 `/api/push/test` - Teste de notificação

---

## 1️⃣ **Console do Servidor (Mais Confiável)** ⭐

### **Desenvolvimento Local (npm run dev):**

No terminal onde você rodou `npm run dev`, você verá:

**✅ Sucesso:**
```bash
# Nenhum log = notificação enviada com sucesso para todos
# (código atual não loga sucessos, apenas falhas)
```

**❌ Falhas:**
```bash
Push send failures for new encomenda: [
  { index: 0, reason: Error: ... },
  { index: 1, reason: Error: ... }
]
```

**Tipos de erro comuns:**
- `Gone (410)` - Subscription expirada (usuário desinstalou app/limpou dados)
- `Unauthorized (401)` - VAPID keys inválidas
- `BadRequest (400)` - Payload inválido
- `NotFound (404)` - Endpoint inválido

---

### **Produção (Vercel):**

1. Acesse: https://vercel.com/jvgomid3/fatepack
2. Vá em: **Deployments**
3. Clique no deploy ativo (botão **"Visit"** ao lado)
4. Clique em: **"View Function Logs"** ou **"Runtime Logs"**
5. Filtre por: `POST /api/encomendas` ou `POST /api/aviso`

**Você verá:**
```bash
✅ [14:32:15] POST /api/encomendas 200 (sucesso - notificação enviada)
❌ [14:32:15] Push send failures for new encomenda: [...]
```

---

## 2️⃣ **Console do Navegador (Usuário que Recebeu)** 📱

### **Passo a passo:**
1. Abrir app no navegador do usuário que deve receber a notificação
2. Abrir **DevTools (F12)** → aba **Console**
3. Enviar notificação (registrar encomenda, criar aviso, etc.)

### **Logs esperados:**

**Se app está em background (minimizado):**
```javascript
✅ [firebase-messaging-sw] Mensagem recebida em background: { title: "📦 Nova encomenda", ... }
✅ [Analytics] Notificação recebida: { title: "📦 Nova encomenda", tag: "new-encomenda" }
```

**Se app está em foreground (aberto/focado):**
```javascript
✅ [Firebase] Notificação recebida em foreground: { notification: { title: "📦 Nova encomenda", ... } }
```

**Se notificação foi clicada:**
```javascript
✅ [Analytics] Notificação clicada: { title: "📦 Nova encomenda", url: "/encomendas" }
✅ [Firebase] Evento recebido do SW: notification_clicked
✅ [Firebase Analytics] notification_clicked { notification_title: "📦 Nova encomenda", ... }
```

---

## 3️⃣ **Banco de Dados (Verificar Subscriptions)** 🗄️

### **Query: Verificar subscriptions ativas**

```sql
-- Ver todas as subscriptions (push_subscription)
SELECT 
  ps.id_subscription,
  ps.user_id,
  u.email,
  u.nome,
  ps.created_at,
  ps.endpoint
FROM push_subscription ps
JOIN usuario u ON u.id_usuario = ps.user_id
ORDER BY ps.created_at DESC;
```

**Interpretação:**
- ✅ Se há subscriptions, notificações **podem** ser enviadas
- ❌ Se tabela está vazia, nenhum usuário se inscreveu para notificações

---

### **Query: Ver quantas notificações foram enviadas para cada usuário**

```sql
-- Contar tentativas de envio por usuário (baseado em logs)
-- Nota: Você precisaria criar tabela notification_logs para isso
SELECT 
  u.nome,
  COUNT(*) as total_notificacoes
FROM notification_logs nl
JOIN usuario u ON u.id_usuario = nl.id_usuario
WHERE nl.sent_at >= NOW() - INTERVAL '7 days'
GROUP BY u.nome
ORDER BY total_notificacoes DESC;
```

---

## 4️⃣ **Implementar Logging no Banco (Recomendado)** 📝

Para ter um histórico completo de notificações enviadas, crie esta tabela:

### **SQL: Criar tabela de logs**

```sql
CREATE TABLE notification_logs (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuario(id_usuario),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  tag VARCHAR(100),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  endpoint TEXT
);

CREATE INDEX idx_notification_logs_user ON notification_logs(id_usuario);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
```

---

### **Modificar código para salvar logs**

#### **Arquivo: `lib/server/push.ts`**

Adicionar logging após enviar notificação:

```typescript
import "server-only"
import webpush from "web-push"
import { query } from "./db" // Assumindo que você tem função query

// ... código existente ...

export async function sendPushWithLogging(
  subscription: PushSubscriptionRecord, 
  payload: any,
  userId: number
) {
  ensureConfigured()
  const opts = { TTL: 30 }
  const data = JSON.stringify(payload)
  
  try {
    await webpush.sendNotification(subscription as any, data, opts)
    
    // 📝 Log de sucesso
    await query(`
      INSERT INTO notification_logs 
        (id_usuario, title, body, url, tag, status, endpoint)
      VALUES ($1, $2, $3, $4, $5, 'sent', $6)
    `, [
      userId,
      payload.title,
      payload.body,
      payload.url,
      payload.tag,
      subscription.endpoint.substring(0, 100) // Truncar endpoint
    ]).catch(() => {}) // Ignora erro de logging
    
    return { success: true }
  } catch (e: any) {
    // 📝 Log de falha
    await query(`
      INSERT INTO notification_logs 
        (id_usuario, title, body, url, tag, status, error_message, endpoint)
      VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7)
    `, [
      userId,
      payload.title,
      payload.body,
      payload.url,
      payload.tag,
      e.message || String(e),
      subscription.endpoint.substring(0, 100)
    ]).catch(() => {}) // Ignora erro de logging
    
    throw e
  }
}
```

---

#### **Arquivo: `app/api/encomendas/route.ts`**

Modificar envio de notificações (linha ~310):

```typescript
// Antes:
const settled = await Promise.allSettled(
  subs.map((s: any) =>
    sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
  )
)

// Depois (com logging):
const settled = await Promise.allSettled(
  subs.map((s: any) =>
    sendPushWithLogging(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, 
      payload,
      s.user_id // Passar user_id para logging
    )
  )
)
```

---

## 5️⃣ **Queries Úteis (Após Implementar Logging)** 📊

### **Total de notificações enviadas (últimos 7 dias)**
```sql
SELECT 
  COUNT(*) as total_enviadas,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sucesso,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as falhas,
  ROUND(
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
    2
  ) as taxa_sucesso_percent
FROM notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days';
```

### **Notificações por usuário**
```sql
SELECT 
  u.nome,
  u.email,
  COUNT(*) as total_notificacoes,
  SUM(CASE WHEN nl.status = 'sent' THEN 1 ELSE 0 END) as recebidas,
  SUM(CASE WHEN nl.status = 'failed' THEN 1 ELSE 0 END) as falhas
FROM notification_logs nl
JOIN usuario u ON u.id_usuario = nl.id_usuario
WHERE nl.sent_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id_usuario, u.nome, u.email
ORDER BY total_notificacoes DESC;
```

### **Últimas 10 notificações enviadas**
```sql
SELECT 
  nl.sent_at,
  u.nome,
  nl.title,
  nl.status,
  nl.error_message
FROM notification_logs nl
JOIN usuario u ON u.id_usuario = nl.id_usuario
ORDER BY nl.sent_at DESC
LIMIT 10;
```

### **Erros mais comuns**
```sql
SELECT 
  error_message,
  COUNT(*) as ocorrencias
FROM notification_logs
WHERE status = 'failed'
  AND sent_at >= NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY ocorrencias DESC
LIMIT 10;
```

---

## 6️⃣ **Firebase Analytics (Opcional)** 📈

**Nota:** Firebase Analytics **NÃO rastreia** notificações enviadas pelo Next.js automaticamente. Ele apenas rastreia:

- ✅ `notification_received` - Quando usuário **recebe** notificação (qualquer origem)
- ✅ `notification_clicked` - Quando usuário **clica** na notificação
- ❌ `notification_sent` - **NÃO rastreia** (você precisa implementar)

Para ver essas métricas:
1. Acesse: https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events
2. Aguarde 10-15 minutos após enviar notificação
3. Procure por eventos: `notification_received`, `notification_clicked`

---

## ✅ **Checklist: Como saber se notificação foi enviada**

### **Método Rápido (SEM modificar código):**
- [ ] Verificar **console do servidor** (terminal ou Vercel logs)
- [ ] Verificar **console do navegador** do usuário (F12)
- [ ] Verificar **subscriptions no banco** (`SELECT * FROM push_subscription`)

### **Método Completo (COM logging no banco):**
- [ ] Criar tabela `notification_logs` (SQL acima)
- [ ] Modificar `lib/server/push.ts` (adicionar função `sendPushWithLogging`)
- [ ] Modificar `/api/encomendas`, `/api/aviso`, `/api/push/test` (usar nova função)
- [ ] Executar queries para ver estatísticas

---

## 🆘 **Troubleshooting**

### **Notificação não aparece no console do servidor**
- ✅ Código atual **não loga sucessos**, apenas **falhas**
- ✅ Ausência de erro = sucesso
- ✅ Implemente logging no banco para ver sucessos

### **Console do navegador não mostra logs**
- ❌ Service Worker não está ativo (DevTools → Application → Service Workers)
- ❌ Broadcast Channel não suportado (navegador antigo)
- ✅ Recarregar página com `Ctrl+Shift+R`

### **Notificação não chega no usuário**
- ❌ Usuário não tem subscription ativa (`push_subscription` vazia)
- ❌ Subscription expirada (erro 410 Gone)
- ❌ Permissão de notificação negada
- ✅ Verificar logs do servidor por erros de envio

---

**Resumo:** Para saber se notificação foi enviada, verifique:
1. **Console do servidor** (terminal ou Vercel logs) - erros aparecem aqui
2. **Console do navegador** do usuário - confirmação de recebimento
3. **Banco de dados** - subscriptions ativas + logs (se implementar)

🎉 **Se não há erros no console do servidor, notificação foi enviada com sucesso!**
