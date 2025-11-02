# 🔥 Firebase Setup - Guia Completo

## 📋 Checklist de Configuração

- [ ] **Passo 1**: Criar projeto no Firebase Console
- [ ] **Passo 2**: Adicionar app Web e obter credenciais
- [ ] **Passo 3**: Gerar VAPID Key (Web Push certificate)
- [ ] **Passo 4**: Adicionar variáveis no `.env.local`
- [ ] **Passo 5**: Atualizar `firebase-messaging-sw.js` com credenciais
- [ ] **Passo 6**: Habilitar Firebase Analytics
- [ ] **Passo 7**: Testar localmente
- [ ] **Passo 8**: Deploy e verificar no Firebase Console

---

## 1️⃣ Criar Projeto no Firebase

### Passos:
1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"**
3. Nome: `FatePack`
4. **Desmarque** Google Analytics (vamos adicionar depois)
5. Clique em **"Criar projeto"**
6. Aguarde ~30 segundos até o projeto ser criado

---

## 2️⃣ Adicionar App Web ao Projeto

### Passos:
1. No dashboard do Firebase, clique no ícone **</>** (Web)
2. **Nome do app**: `FatePack Web`
3. **Não marque** Firebase Hosting por enquanto
4. Clique em **"Registrar app"**

### Copiar Credenciais:
Você verá algo assim:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  authDomain: "fatepack-a1b2c.firebaseapp.com",
  projectId: "fatepack-a1b2c",
  storageBucket: "fatepack-a1b2c.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**📝 Guarde essas credenciais em um arquivo temporário!**

---

## 3️⃣ Gerar VAPID Key (Web Push Certificate)

### Passos:
1. No Firebase Console, clique em **⚙️ Configurações do projeto**
2. Aba **"Cloud Messaging"**
3. Role até **"Web Push certificates"**
4. Clique em **"Generate key pair"**
5. **Copie** a chave pública que aparece (algo como: `BNxxx...`)

**Exemplo**:
```
BNjQW5z... (copiar tudo)
```

---

## 4️⃣ Configurar Variáveis de Ambiente

### Arquivo: `.env.local`

Adicione as seguintes variáveis com os valores copiados dos passos 2 e 3:

```env
# 🔥 Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fatepack-a1b2c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fatepack-a1b2c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fatepack-a1b2c.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNjQW5z... (copiar chave completa)
```

⚠️ **ATENÇÃO**: Substitua TODOS os valores pelos seus valores reais!

---

## 5️⃣ Atualizar Service Worker

### Arquivo: `public/firebase-messaging-sw.js`

**Abra o arquivo** e substitua as credenciais na linha ~6:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456", // ← SUBSTITUIR
  authDomain: "fatepack-a1b2c.firebaseapp.com", // ← SUBSTITUIR
  projectId: "fatepack-a1b2c", // ← SUBSTITUIR
  storageBucket: "fatepack-a1b2c.appspot.com", // ← SUBSTITUIR
  messagingSenderId: "123456789012", // ← SUBSTITUIR
  appId: "1:123456789012:web:abcdef1234567890" // ← SUBSTITUIR
}
```

⚠️ **Use os MESMOS valores do `.env.local`!**

---

## 6️⃣ Habilitar Firebase Analytics (Opcional)

### Passos:
1. No Firebase Console, vá em **"Analytics"** no menu lateral
2. Clique em **"Enable Google Analytics"**
3. Selecione **"Create a new account"**
4. Nome da conta: `FatePack Analytics`
5. Aceite os termos e clique em **"Enable Analytics"**
6. Aguarde ~1 minuto

### Copiar Measurement ID:
1. Vá em **⚙️ Configurações do projeto**
2. Em **"General"**, role até ver **"Measurement ID"**: `G-XXXXXXXXXX`
3. Adicione ao `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 7️⃣ Testar Localmente

### 1. Instalar dependências:
```bash
npm install firebase
```

### 2. Iniciar servidor local:
```bash
npm run dev
```

### 3. Abrir no navegador:
```
http://localhost:3000
```

### 4. Verificar console do navegador:
Pressione **F12** e veja se aparece:

```
[Firebase] FCM Token obtido: xxxxx...
[Firebase Analytics] notification_permission { status: 'granted' }
```

### 5. Solicitar permissão de notificação:
Se ainda não tiver permissão, o navegador vai pedir. Clique em **"Permitir"**.

---

## 8️⃣ Verificar no Firebase Console

### Analytics:
1. Vá em **Analytics > Events**
2. Você deve ver eventos como:
   - `notification_permission`
   - `fcm_token_generated`

### Cloud Messaging:
1. Vá em **Cloud Messaging**
2. Clique em **"Send your first message"**
3. Preencha:
   - **Título**: "Teste"
   - **Texto**: "Notificação de teste"
4. Clique em **"Send test message"**
5. Cole o **FCM Token** do console (aquele que apareceu no passo 7.4)
6. Clique em **"Test"**

Se receber a notificação, está funcionando! 🎉

---

## 📊 Eventos Rastreados Automaticamente

| Evento | Quando é disparado | Parâmetros |
|--------|-------------------|-----------|
| `notification_permission` | Ao verificar permissão de notificação | `status`: granted/denied/default |
| `fcm_token_generated` | Ao obter token FCM | `token_length` |
| `notification_received` | Ao receber notificação (foreground) | `title`, `body`, `timestamp` |
| `notification_clicked` | Ao clicar na notificação | `title`, `timestamp` |

---

## 🔍 Como Ver os Dados no Firebase Console

### Analytics Dashboard:
1. Acesse **Analytics > Dashboard**
2. Veja métricas em tempo real:
   - **Usuários ativos**
   - **Eventos por hora**
   - **Eventos mais populares**

### Events Explorer:
1. Acesse **Analytics > Events**
2. Filtre por evento específico:
   - `notification_clicked`
   - `notification_received`
3. Veja gráficos de:
   - **Quantidade de cliques por dia**
   - **Taxa de abertura de notificações**

### Custom Reports:
1. Acesse **Analytics > Custom Reports**
2. Crie relatórios como:
   - **Taxa de conversão**: usuários que receberam → clicaram
   - **Horários de pico**: quando mais pessoas clicam
   - **Dispositivos**: Android vs iOS vs Desktop

---

## 🚀 Próximos Passos

### 1. Salvar Token FCM no Banco
Criar tabela:
```sql
CREATE TABLE fcm_tokens (
  id_usuario INTEGER REFERENCES usuario(id_usuario),
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id_usuario, fcm_token)
);
```

Endpoint para salvar:
```typescript
// app/api/user/fcm-token/route.ts
export async function POST(req: Request) {
  const user = getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const { token } = await req.json()
  
  await db.query(`
    INSERT INTO fcm_tokens (id_usuario, fcm_token, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (id_usuario, fcm_token) 
    DO UPDATE SET updated_at = NOW()
  `, [user.id, token])
  
  return NextResponse.json({ ok: true })
}
```

### 2. Enviar Notificações Segmentadas
Ao registrar encomenda, buscar tokens dos moradores do apartamento:
```typescript
const tokens = await db.query(`
  SELECT fcm_token FROM fcm_tokens WHERE id_usuario = $1
`, [idMorador])

// Enviar via Firebase Admin SDK (servidor)
```

### 3. Dashboard de Analytics
Criar página `/admin/analytics` com:
- Total de notificações enviadas
- Taxa de abertura (cliques / enviadas)
- Gráfico de cliques por dia da semana
- Horário de pico de abertura

---

## 🐛 Troubleshooting

### Erro: "Firebase: Error (auth/invalid-api-key)"
✅ Verifique se o `NEXT_PUBLIC_FIREBASE_API_KEY` está correto no `.env.local`

### Erro: "Messaging: We are unable to register the default service worker"
✅ Verifique se `firebase-messaging-sw.js` está em `/public/`
✅ Reinicie o servidor: `npm run dev`

### Notificação não aparece no Firefox
✅ Firefox requer HTTPS para notificações. Use `ngrok` ou deploy em produção.

### Token FCM não é gerado
✅ Verifique se a permissão de notificação foi concedida
✅ Verifique se o VAPID Key está correto

### Analytics não mostra eventos
✅ Aguarde 24h - dados podem ter delay
✅ Use "DebugView" no Firebase Console para ver eventos em tempo real:
   1. Instale extensão: [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)
   2. Ative a extensão
   3. Acesse **Analytics > DebugView**

---

## 📚 Documentação Oficial

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Firebase Analytics](https://firebase.google.com/docs/analytics/get-started?platform=web)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)

---

**Última atualização**: 2025-11-02
**Próxima revisão**: Após primeiro deploy em produção
