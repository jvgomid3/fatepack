# 🚀 Configurar Variáveis de Ambiente no Vercel

## ⚠️ **IMPORTANTE: Adicione estas variáveis no Vercel para o app funcionar!**

Quando você faz deploy no Vercel, o arquivo `.env.local` **NÃO é enviado** por segurança. Você precisa configurar as variáveis de ambiente manualmente no painel do Vercel.

---

## 📝 **Passo a passo:**

### **1. Acessar Vercel Dashboard**
```
https://vercel.com/jvgomid3/fatepack/settings/environment-variables
```

Ou manualmente:
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **"fatepack"**
3. Vá em: **Settings** → **Environment Variables**

---

### **2. Adicionar variáveis do Firebase**

Clique em **"Add New"** e adicione UMA POR VEZ:

#### **NEXT_PUBLIC_FIREBASE_API_KEY**
```
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
⚠️ **Substitua pelo valor real obtido no Firebase Console**
- Environment: `Production`, `Preview`, `Development` (marcar todas)

#### **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
```
fatepack.firebaseapp.com
```
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
```
fatepack
```
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
```
fatepack.firebasestorage.app
```
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
```
XXXXXXXXXXXX
```
⚠️ **Substitua pelo valor real obtido no Firebase Console**
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_APP_ID**
```
1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXXXXXX
```
⚠️ **Substitua pelo valor real obtido no Firebase Console**
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID**
```
G-XXXXXXXXXX
```
⚠️ **Substitua pelo valor real obtido no Firebase Console**
- Environment: `Production`, `Preview`, `Development`

#### **NEXT_PUBLIC_FIREBASE_VAPID_KEY**
```
BXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
⚠️ **Substitua pelo valor real obtido em Firebase Console → Cloud Messaging → Web Push certificates**
- Environment: `Production`, `Preview`, `Development`

---

### **3. Adicionar outras variáveis necessárias**

Se você tem outras variáveis no `.env.local` (banco de dados, etc.), adicione também:

#### **DATABASE_URL** (exemplo - ajustar conforme seu banco)
```
postgresql://usuario:senha@host:5432/database
```

#### **NEXT_PUBLIC_VAPID_PUBLIC_KEY**
```
BXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
⚠️ **Substitua pelo valor real (mesma chave pública VAPID do Firebase)**

#### **VAPID_PRIVATE_KEY**
```
(sua chave privada VAPID - NÃO compartilhe publicamente!)
```

---

### **4. Redeploy após adicionar variáveis**

Depois de adicionar todas as variáveis:

1. Vá em: **Deployments**
2. Clique nos **três pontos (...)** do último deploy
3. Clique em **"Redeploy"**
4. Marque **"Use existing Build Cache"** (opcional - mais rápido)
5. Clique em **"Redeploy"**

Ou via terminal:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## 🔍 **Como verificar se deu certo:**

### **1. Abrir o app em produção**
```
https://fatepack.vercel.app
```

### **2. Abrir DevTools (F12) → Console**

Você deve ver:
```
✅ [Firebase] Permissão atual: default
✅ [Firebase] Token FCM obtido com sucesso
```

**NÃO deve ver:**
```
❌ [Firebase] Firebase não configurado. Pulando inicialização.
❌ [Firebase] Configuração incompleta. Firebase será desabilitado.
❌ Application error: a client-side exception has occurred
```

---

## 📋 **Checklist de variáveis**

Copie e cole no Vercel (Settings → Environment Variables):

- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

**Total: 8 variáveis Firebase**

---

## 🆘 **Troubleshooting**

### **Erro: "Application error: a client-side exception has occurred"**
- ✅ **Corrigido!** Código atualizado com tratamento de erro
- ✅ Agora se Firebase não estiver configurado, app continua funcionando (sem analytics)

### **Console mostra: "Firebase não configurado"**
- ⚠️ Variáveis de ambiente não estão configuradas no Vercel
- ✅ Adicione variáveis conforme instruções acima
- ✅ Faça redeploy

### **App funciona localmente mas não em produção**
- `.env.local` não é enviado para Vercel
- Adicione variáveis manualmente no Vercel Dashboard
- Redeploy após adicionar

---

## 🚀 **Próximos passos**

1. **Adicionar todas as 8 variáveis no Vercel** (conforme lista acima)
2. **Redeploy** (Deployments → Redeploy)
3. **Testar** app em produção (https://fatepack.vercel.app)
4. **Verificar console** (F12) - não deve ter erros
5. **Testar notificações** em produção

---

## 📚 **Referências**

- [Vercel - Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js - Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)
- [Firebase - Web Setup](https://firebase.google.com/docs/web/setup)

---

**Resumo:** Adicione as 8 variáveis Firebase no Vercel Dashboard e faça redeploy! 🎉
