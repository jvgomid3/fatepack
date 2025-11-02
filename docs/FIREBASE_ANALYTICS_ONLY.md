# 📊 Firebase Analytics - Apenas Rastreamento

Este documento explica como usar o Firebase **APENAS para Analytics**, mantendo o envio de notificações pelo Next.js.

---

## 🎯 Arquitetura

### **Envio de Notificações (Next.js Web Push API)**
```
Next.js Backend (lib/server/push.ts)
    ↓
Web Push API (webpush.sendNotification)
    ↓
Service Worker (public/sw.js)
    ↓
Navegador do usuário
```

✅ **Vantagens:**
- Controle total do backend
- Sem custos adicionais
- Customização completa

### **Analytics (Firebase)**
```
Service Worker (sw.js)
    ↓
API Routes (/api/analytics/*)
    ↓
Firebase Analytics (client-side)
    ↓
Firebase Console (dashboards)
```

✅ **Vantagens:**
- Dashboards profissionais
- Métricas de engajamento
- Análise de comportamento

---

## 📝 Fluxo Completo

### **1. Quando notificação é ENVIADA (Next.js)**
```typescript
// lib/server/push.ts
await webpush.sendNotification(subscription, JSON.stringify({
  title: "Nova encomenda",
  body: "Você tem uma encomenda para retirar",
  url: "/encomendas",
  tag: "encomenda-123",
}))
```

### **2. Quando notificação é RECEBIDA (Service Worker)**
```javascript
// public/sw.js - linha 17
self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  // 📊 Rastrear recebimento
  fetch('/api/analytics/notification-received', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      body: data.body,
      tag: data.tag,
      timestamp: new Date().toISOString(),
    }),
  })
  
  // Mostrar notificação
  self.registration.showNotification(title, { ... })
})
```

### **3. Quando notificação é CLICADA (Service Worker)**
```javascript
// public/sw.js - linha 52
self.addEventListener('notificationclick', (event) => {
  // 📊 Rastrear clique
  fetch('/api/analytics/notification-click', {
    method: 'POST',
    body: JSON.stringify({
      title: event.notification.title,
      url: url,
      timestamp: new Date().toISOString(),
    }),
  })
  
  // Abrir app
  clients.openWindow(url)
})
```

### **4. Backend processa eventos (API Routes)**
```typescript
// app/api/analytics/notification-received/route.ts
export async function POST(req: Request) {
  const { title, body, tag, timestamp } = await req.json()
  
  console.log("[Analytics] Notificação recebida:", { title, tag })
  
  // Opcional: Salvar no banco de dados
  // await db.query(`INSERT INTO notification_analytics ...`)
  
  return NextResponse.json({ ok: true })
}
```

---

## 📊 Visualizar Métricas

### **Firebase Console - Analytics → Events**
📍 **URL Direta:** https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events

**Como acessar:**
1. Acesse Firebase Console
2. Selecione o projeto "fatepack"
3. Menu lateral → **Analytics** → **Events**
4. Aguarde **10-15 minutos** para dados aparecerem (primeira vez pode demorar até 24h)

**Eventos disponíveis:**
- ✅ `notification_received` - Quando notificação é recebida pelo usuário
- ✅ `notification_clicked` - Quando usuário clica na notificação
- ✅ `notification_permission` - Quando usuário concede/nega permissão
- ✅ `fcm_token_generated` - Quando token FCM é gerado
- ✅ `page_view` - Visualizações de página (automático)

**Métricas por evento:**
- **Event count** - Total de eventos
- **Event count per user** - Média por usuário
- **Total users** - Usuários únicos que dispararam o evento
- **Event value** - Valor customizado (se configurado)

### **Firebase Console - Analytics → Dashboard**
📍 **URL:** https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/overview

**Métricas gerais:**
- Total de usuários ativos (últimas 24h, 7 dias, 30 dias)
- Engajamento de usuários
- Eventos por usuário
- Retenção de usuários

### **Console do Navegador (tempo real)**
```
[Firebase Analytics] Notificação recebida: { title: "Nova encomenda", tag: "enc-123" }
[Firebase Analytics] Notificação clicada: { title: "Nova encomenda", url: "/encomendas" }
```

---

## 🗄️ Salvar Eventos no Banco (Opcional)

Se quiser criar analytics customizado (além do Firebase), crie esta tabela:

```sql
CREATE TABLE notification_analytics (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'received' ou 'clicked'
  title TEXT,
  body TEXT,
  tag VARCHAR(100),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX idx_notification_analytics_created_at ON notification_analytics(created_at);
```

Depois descomente o código nos endpoints:
- `app/api/analytics/notification-received/route.ts` (linha 18-21)
- `app/api/analytics/notification-click/route.ts` (linha 17-20)

---

## 🔍 Queries Úteis (Analytics Customizado)

### **Total de notificações recebidas (últimos 7 dias)**
```sql
SELECT COUNT(*) 
FROM notification_analytics 
WHERE event_type = 'received' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

### **Taxa de cliques (CTR - Click-Through Rate)**
```sql
SELECT 
  COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) * 100.0 / 
  COUNT(CASE WHEN event_type = 'received' THEN 1 END) AS ctr_percentage
FROM notification_analytics
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### **Top 5 notificações mais clicadas**
```sql
SELECT title, COUNT(*) as clicks
FROM notification_analytics
WHERE event_type = 'clicked'
GROUP BY title
ORDER BY clicks DESC
LIMIT 5;
```

---

## ✅ Vantagens desta Abordagem

1. **Envio pelo Next.js (mantém)**:
   - ✅ Controle total do backend
   - ✅ Sem dependência de Firebase Cloud Messaging
   - ✅ Sem custos de FCM
   - ✅ Código atual continua funcionando

2. **Analytics pelo Firebase**:
   - ✅ Dashboards profissionais no Console
   - ✅ Métricas de engajamento automáticas
   - ✅ Integração com Google Analytics (opcional)
   - ✅ Análise de comportamento de usuários

3. **Analytics Customizado (opcional)**:
   - ✅ Queries SQL customizadas
   - ✅ Relatórios personalizados
   - ✅ Integração com BI tools (Metabase, Looker, etc.)

---

## 🚀 Próximos Passos

1. **Testar fluxo completo**:
   - Enviar notificação pelo Next.js (como já faz hoje)
   - Verificar console: `[Analytics] Notificação recebida`
   - Clicar na notificação
   - Verificar console: `[Analytics] Notificação clicada`

2. **Verificar Firebase Console** (após 10-15 minutos):
   - Firebase Console → Analytics → Events
   - Procurar por eventos customizados

3. **Criar tabela no banco** (opcional):
   - Executar SQL acima
   - Descomentar código nos endpoints
   - Criar queries/dashboards customizados

---

## 🆘 Troubleshooting

### **Eventos não aparecem no console**
- Abra DevTools (F12) → aba Console
- Recarregue com `Ctrl+Shift+R`
- Envie notificação de teste

### **Eventos não aparecem no Firebase Console**
- Aguarde 10-15 minutos (dados levam tempo para propagar)
- Verifique se Measurement ID está correto no `.env.local`
- Verifique se `FirebaseInit.tsx` está importado no `layout.tsx`

### **Service Worker não está registrando eventos**
- Abra DevTools → Application → Service Workers
- Verifique se `sw.js` está "activated and running"
- Clique em "Update" para recarregar SW
- Verifique console por erros

---

## 📚 Referências

- [Firebase Analytics - Web](https://firebase.google.com/docs/analytics/get-started?platform=web)
- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Resumo:** Você continua enviando notificações pelo Next.js (como já faz), mas agora rastreia métricas de recebimento/cliques usando Firebase Analytics! 🎉
