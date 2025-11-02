# 🔒 Política de Segurança - FatePack

## 📋 Visão Geral

Este documento descreve as práticas de segurança implementadas no projeto **FatePack** (Sistema de Gerenciamento de Encomendas em Condomínios) desenvolvido como Trabalho de Conclusão de Curso.

---

## 🔐 Gerenciamento de Credenciais

### **Variáveis de Ambiente**

Credenciais sensíveis são armazenadas em variáveis de ambiente e **NÃO** commitadas no repositório:

✅ **Protegidas via `.env.local` (gitignored):**
- Chaves VAPID privadas (Web Push)
- Credenciais de banco de dados (Supabase)
- Tokens de autenticação (JWT_SECRET)
- Service Role Keys

❌ **NÃO devem estar em:**
- Código-fonte
- Arquivos de configuração commitados
- Documentação pública (valores reais)

### **Configuração em Produção**

Variáveis de ambiente são configuradas no **Vercel Dashboard**:
- Settings → Environment Variables
- Separadas por ambiente: `Production`, `Preview`, `Development`
- Documentação: `docs/VERCEL_ENV_SETUP.md` (valores sanitizados)

---

## 🔥 Firebase API Keys - Esclarecimento Importante

### **Por que Firebase API Keys estão expostas no código?**

**Resposta Curta:** Firebase API Keys são **públicas por design** e não são secrets tradicionais.

**Documentação Oficial do Firebase:**
> "Unlike how API keys are typically used, API keys for Firebase services are not used to control access to backend resources; that can only be done with Firebase Security Rules. Usually, you need to fastidiously guard API keys; however, **for Firebase, this is not the case**."
>
> Fonte: https://firebase.google.com/docs/projects/api-keys

### **O que realmente protege o Firebase:**

1. **Firebase Security Rules** ✅
   - Controla acesso ao Firestore, Storage, etc.
   - Configuradas no Firebase Console

2. **Domínios Autorizados** ✅
   - Apenas domínios whitelisted podem usar a API Key
   - Configurado em: Firebase Console → Project Settings → Authorized domains

3. **Quotas e Rate Limits** ✅
   - Previne abuso mesmo se alguém tentar usar a API Key
   - Configurado no Google Cloud Console

### **Credenciais Firebase no projeto:**

| Credencial | Visibilidade | Risco | Proteção |
|------------|-------------|-------|----------|
| **API Key** | Pública | Baixo | Domínios autorizados + Firebase Rules |
| **App ID** | Pública | Nenhum | Identificador público |
| **Project ID** | Pública | Nenhum | Identificador público |
| **Measurement ID** | Pública | Nenhum | Analytics público |
| **VAPID Key (pública)** | Pública | Baixo | Apenas identifica origem |

### **Arquivo `public/firebase-messaging-sw.js`:**

Este arquivo contém credenciais Firebase porque:
- ✅ Service Workers **não têm acesso** a variáveis de ambiente
- ✅ Credenciais são necessárias para inicializar Firebase Messaging
- ✅ É a **prática padrão recomendada** pelo Firebase
- ✅ Protegido por Firebase Rules e domínios autorizados

**Referências:**
- https://firebase.google.com/docs/cloud-messaging/js/client
- https://firebase.google.com/docs/projects/api-keys

---

## 🛡️ Segurança de API

### **Autenticação**

Sistema de autenticação implementado com:
- ✅ JWT tokens seguros
- ✅ Validação server-side em rotas protegidas
- ✅ Middleware de autenticação (`middleware.ts`)
- ✅ Sessões com Supabase Auth

### **Autorização**

Controle de acesso baseado em papéis:
- **Admin (Porteiro)**: Acesso total ao sistema
- **Morador**: Acesso limitado às próprias encomendas
- **Visitante**: Apenas páginas públicas (login, cadastro)

### **Validação de Dados**

- ✅ Validação server-side em todas as API routes
- ✅ Sanitização de inputs
- ✅ Tipagem TypeScript forte
- ✅ Queries parametrizadas (SQL Injection prevention)

---

## 🗄️ Segurança de Banco de Dados

### **Supabase (PostgreSQL)**

- ✅ **Row Level Security (RLS)** habilitado
- ✅ Políticas de acesso por usuário
- ✅ Service Role Key protegida (server-only)
- ✅ Anon Key pública (limitada pelo RLS)
- ✅ Queries parametrizadas

### **Exemplo de RLS Policy:**

```sql
-- Moradores só veem suas próprias encomendas
CREATE POLICY "moradores_view_own_encomendas"
ON encomenda FOR SELECT
USING (
  id_apartamento IN (
    SELECT id_apartamento FROM vinculo_morador 
    WHERE id_usuario = auth.uid()
  )
);
```

---

## 🔔 Segurança de Notificações Push

### **Web Push API**

- ✅ Chaves VAPID geradas de forma segura
- ✅ Chave privada VAPID **nunca** exposta no client
- ✅ Subscriptions associadas a usuários autenticados
- ✅ Validação de permissões antes de enviar

### **Firebase Cloud Messaging**

- ✅ API Key com restrições no Firebase Console
- ✅ VAPID Key pública (necessária para FCM)
- ✅ Tokens FCM associados a usuários
- ✅ Mensagens enviadas apenas para usuários autorizados

---

## 📊 Privacidade e LGPD

### **Dados Coletados**

- **Cadastro:** Nome, email, telefone, CPF
- **Moradia:** Apartamento, bloco
- **Encomendas:** Empresa, destinatário, data de recebimento/retirada
- **Notificações:** Endpoints de push subscriptions
- **Analytics:** Eventos de uso (Firebase Analytics - opcional)

### **Consentimento**

- ✅ Permissão de notificações solicitada explicitamente
- ✅ Usuário pode revogar permissão a qualquer momento
- ✅ Dados de encomendas visíveis apenas para moradores autorizados

### **Retenção de Dados**

- Histórico de encomendas: Mantido indefinidamente (requisito do negócio)
- Logs de sistema: 90 dias
- Push subscriptions inválidas: Removidas automaticamente

---

## ✅ Checklist de Segurança (Avaliação TCC)

### **Desenvolvimento**

- [x] `.env.local` no `.gitignore`
- [x] Sem secrets sensíveis hardcoded (exceto Firebase public keys)
- [x] Documentação sanitizada (placeholders em docs)
- [x] Middleware de autenticação implementado
- [x] Validação de inputs server-side
- [x] Queries parametrizadas (SQL Injection prevention)
- [x] `.env.example` disponível

### **Produção**

- [x] Variáveis de ambiente configuradas no Vercel
- [x] HTTPS habilitado (automático na Vercel)
- [x] Firebase API Key com restrições de domínio
- [x] Firebase Security Rules configuradas
- [x] Row Level Security (RLS) habilitado no Supabase
- [ ] Rate limiting implementado (recomendado para produção real)
- [ ] Monitoramento de erros (opcional - Sentry, etc.)

### **Firebase**

- [x] API Key pública (design do Firebase)
- [x] Domínios autorizados configurados
- [x] Firebase Rules para Firestore/Storage (se usado)
- [x] Quotas e limites configurados

### **Banco de Dados**

- [x] Row Level Security (RLS) ativo
- [x] Políticas de acesso por usuário
- [x] Service Role Key apenas no servidor
- [x] Backup automático (Supabase)

---

## 🚨 Relatório de Vulnerabilidades

### **Como Reportar**

Se você identificar uma vulnerabilidade:

1. **NÃO** abra issue pública no GitHub
2. Envie email para: [seu-email-acadêmico]
3. Inclua:
   - Descrição detalhada
   - Passos para reproduzir
   - Impacto potencial
   - Sugestões de correção

### **Vulnerabilidades Conhecidas e Aceitas**

#### **1. Firebase API Keys Expostas**
- **Status:** Aceito (design do Firebase)
- **Mitigação:** Domínios autorizados + Firebase Rules
- **Risco:** Baixo
- **Referência:** https://firebase.google.com/docs/projects/api-keys

#### **2. Rate Limiting Não Implementado**
- **Status:** Pendente (recomendado para produção)
- **Mitigação:** Limitações do Vercel (quotas de requisições)
- **Risco:** Médio (abuso de APIs)
- **Documentação:** `docs/RATE_LIMITING.md`

---

## 📚 Referências de Segurança

### **Documentação Oficial**

- [Firebase Security](https://firebase.google.com/docs/rules)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Push Security](https://web.dev/push-notifications-web-push-protocol/)

### **Documentação do Projeto**

- `docs/SECURITY_REPORT.md` - Análise de segurança detalhada
- `docs/RATE_LIMITING.md` - Guia de rate limiting
- `docs/VERCEL_ENV_SETUP.md` - Configuração de ambiente
- `docs/FIREBASE_SETUP.md` - Setup Firebase
- `.env.example` - Exemplo de variáveis de ambiente

---

## 🎓 Considerações para Avaliação Acadêmica

### **Práticas Implementadas**

1. ✅ **Separação de Credenciais:** `.env.local` + `.gitignore`
2. ✅ **Autenticação e Autorização:** JWT + RLS
3. ✅ **Validação de Dados:** Server-side + TypeScript
4. ✅ **Prevenção de SQL Injection:** Queries parametrizadas
5. ✅ **HTTPS:** Habilitado automaticamente (Vercel)
6. ✅ **Conformidade LGPD:** Coleta mínima de dados + consentimento

### **Justificativas Técnicas**

#### **"Por que Firebase API Keys estão expostas no GitHub?"**

**Resposta:**
> Firebase API Keys são públicas por design e não são secrets tradicionais. Elas são protegidas por domínios autorizados configurados no Firebase Console e Firebase Security Rules. Esta é a prática padrão recomendada pela documentação oficial do Google Firebase.

#### **"O sistema está protegido contra SQL Injection?"**

**Resposta:**
> Sim. Todas as queries utilizam parametrização via Supabase client, que previne SQL Injection automaticamente. Além disso, Row Level Security (RLS) garante que usuários só acessem dados autorizados.

#### **"Como é feito o controle de acesso?"**

**Resposta:**
> Implementado em duas camadas: (1) Middleware Next.js valida autenticação antes de acessar rotas, (2) Row Level Security no PostgreSQL valida autorização a nível de banco de dados.

---

## 🔧 Melhorias Futuras (Pós-TCC)

Para um ambiente de produção real, recomenda-se:

- [ ] Implementar rate limiting em todas as API routes
- [ ] Adicionar monitoramento com Sentry ou similar
- [ ] Criar dashboard de métricas de segurança
- [ ] Implementar 2FA para usuários admin
- [ ] Adicionar logs de auditoria detalhados
- [ ] Configurar alertas de segurança automatizados
- [ ] Realizar penetration testing profissional

---

## 📞 Informações do Projeto

**Projeto:** FatePack - Sistema de Gerenciamento de Encomendas em Condomínios  
**Tipo:** Trabalho de Conclusão de Curso (TCC)  
**Área:** Tecnologia da Informação  
**Ano:** 2025

---

**Última atualização:** 02/11/2025

---

⚠️ **NOTA IMPORTANTE:** Este é um projeto acadêmico desenvolvido para fins educacionais. Para uso em produção real, recomenda-se auditoria de segurança profissional e implementação das melhorias listadas acima.
