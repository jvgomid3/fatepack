# 📍 Onde ver métricas de notificações no Firebase Console

## 🎯 **URL Direta - Analytics → Events**

```
https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events
```

---

## 🗺️ **Passo a passo visual:**

### **1. Acessar Firebase Console**
```
https://console.firebase.google.com/
```
- Fazer login com sua conta Google
- Selecionar projeto **"fatepack"**

### **2. Menu lateral → Analytics**
```
Sidebar esquerda → Analytics (ícone de gráfico 📊)
```

Opções dentro de Analytics:
- **Dashboard** - Visão geral de usuários ativos
- **Events** ⭐ **← AQUI você vê notificações recebidas/clicadas**
- **Conversions** - Eventos de conversão
- **Audiences** - Públicos/segmentos
- **Funnels** - Funis de conversão
- **User properties** - Propriedades dos usuários
- **Latest release** - Versões do app
- **Retention** - Retenção de usuários
- **StreamView** - Eventos em tempo real (debug)

### **3. Analytics → Events** ⭐
```
Analytics → Events → Clicar em "View all events"
```

**Eventos customizados disponíveis:**
- ✅ `notification_received` - Total de notificações recebidas
- ✅ `notification_clicked` - Total de cliques em notificações
- ✅ `notification_permission` - Usuários que concederam/negaram permissão
- ✅ `fcm_token_generated` - Tokens FCM gerados

**Colunas da tabela:**
| Coluna | Descrição |
|--------|-----------|
| **Event name** | Nome do evento customizado |
| **Event count** | Total de vezes que o evento ocorreu (últimas 24h) |
| **Users** | Número de usuários únicos que dispararam o evento |
| **Event count per user** | Média de eventos por usuário |

### **4. Clicar no evento para ver detalhes**
```
Events → Clicar em "notification_received" ou "notification_clicked"
```

**Detalhes disponíveis:**
- **Event parameters** - Parâmetros customizados:
  - `notification_title` - Título da notificação
  - `notification_tag` - Tag da notificação
  - `notification_url` - URL da notificação (apenas em clicks)
  - `timestamp` - Timestamp do evento
- **User engagement** - Engajamento por usuário
- **Event count over time** - Gráfico temporal
- **Top event parameter values** - Valores mais comuns dos parâmetros

---

## ⏱️ **Tempo de propagação dos dados**

### **Primeira vez (inicialização)**
- ⏳ **10-15 minutos**: Dados começam a aparecer
- ⏳ **1-2 horas**: Dados completamente processados
- ⏳ **Até 24 horas**: Em alguns casos (primeira vez)

### **Após configuração (já funcionando)**
- ⚡ **5-10 minutos**: Dados aparecem no dashboard
- ⚡ **Tempo real (StreamView)**: Dados aparecem em ~1 minuto

### **Debug Mode (tempo real)**
Para ver eventos em tempo real durante desenvolvimento:

1. Habilitar Debug Mode:
```javascript
// Adicionar no lib/firebase.ts (apenas desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  (window as any).gtag?.('config', measurementId, {
    debug_mode: true
  })
}
```

2. Acessar: https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/streamview

3. Abrir app no navegador → Eventos aparecem em ~30 segundos

---

## 📊 **Como criar relatórios customizados**

### **1. Analytics → Custom Reports**
```
Analytics → (scroll down) → Custom reports → Create custom report
```

**Exemplo: Taxa de cliques em notificações (CTR)**
- **Métrica 1**: `notification_received` (event count)
- **Métrica 2**: `notification_clicked` (event count)
- **Cálculo**: `(notification_clicked / notification_received) * 100`

### **2. Exportar para BigQuery (opcional)**
Para análises avançadas (SQL queries, dashboards customizados):

1. Firebase Console → Project Settings
2. Integrations → BigQuery → Link
3. Aguardar 24h para exportação inicial
4. Acessar BigQuery: https://console.cloud.google.com/bigquery
5. Executar queries SQL customizadas

**Exemplo de query:**
```sql
SELECT
  event_name,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_pseudo_id) as unique_users,
  ROUND(COUNT(*) / COUNT(DISTINCT user_pseudo_id), 2) as events_per_user
FROM `fatepack.analytics_XXXXX.events_*`
WHERE event_name IN ('notification_received', 'notification_clicked')
  AND _TABLE_SUFFIX BETWEEN '20250101' AND '20250131'
GROUP BY event_name
ORDER BY total_events DESC
```

---

## 🔍 **Queries úteis no Firebase Console**

### **Ver apenas eventos de notificações**
```
Events → Filter → Event name → Contains "notification"
```

### **Ver eventos por usuário específico**
```
Analytics → User properties → Add filter → User ID → Equals "usuario123"
```

### **Ver eventos por período**
```
Analytics → (canto superior direito) → Date range → Last 7 days / Last 30 days / Custom
```

---

## 🆘 **Troubleshooting**

### **Eventos não aparecem após 24h**
1. Verificar console do navegador (F12) por erros
2. Verificar se `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` está correto
3. Verificar se `FirebaseInit.tsx` está sendo renderizado
4. Verificar DevTools → Application → Service Workers → sw.js está "activated"
5. Verificar Network tab → fetch para `/api/analytics/notification-*` retorna 200 OK

### **Eventos aparecem no console mas não no Firebase**
1. Verificar se `trackEvent()` está sendo chamado com `analytics` válido
2. Verificar se `Broadcast Channel` está funcionando (F12 → console)
3. Recarregar página com `Ctrl+Shift+R`
4. Aguardar 15-30 minutos (dados podem estar em fila)

### **Quero ver eventos em tempo real**
1. Habilitar Debug Mode (ver seção acima)
2. Acessar: Analytics → StreamView
3. Abrir app em outra aba → Eventos aparecem em ~1 minuto

---

## 📚 **Referências**

- [Firebase Analytics - Web](https://firebase.google.com/docs/analytics/get-started?platform=web)
- [Firebase Analytics - Events](https://firebase.google.com/docs/analytics/events?platform=web)
- [Firebase Analytics - Debug Mode](https://firebase.google.com/docs/analytics/debugview)
- [BigQuery Export](https://firebase.google.com/docs/analytics/bigquery-export)

---

## ✅ **Checklist - Verificar configuração**

- [ ] Firebase Console → Projeto "fatepack" selecionado
- [ ] Analytics habilitado no projeto
- [ ] Measurement ID correto no `.env.local`: `G-L9VD0M035H`
- [ ] App ID correto no `.env.local`: `1:367593974847:web:839ca00f5b67ff65b75c8a`
- [ ] `FirebaseInit.tsx` importado no `app/layout.tsx`
- [ ] Service Worker (`sw.js`) registrado e ativo
- [ ] Broadcast Channel funcionando (console mostra eventos)
- [ ] Aguardar 10-15 minutos após primeiro teste

---

**Resumo:** Acesse https://console.firebase.google.com/project/fatepack/analytics/app/web:839ca00f5b67ff65b75c8a/events e aguarde 10-15 minutos! 🎉
