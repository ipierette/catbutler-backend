# 🚀 GUIA COMPLETO - Setup do CatButler Backend

![CatButler Logo](../logo-catbutler.webp)

## 🔧 CORREÇÕES DE SEGURANÇA APLICADAS

### ✅ Vulnerabilidades NPM Corrigidas
- ✅ **Atualizado @vercel/node** para versão mais segura
- ✅ **Corrigido path-to-regexp** e outras dependências
- ✅ **Melhorado sistema de autenticação** com validações extras
- ✅ **Logs seguros** (IDs de usuário parciais, sem dados sensíveis)

### 🛡️ Melhorias na Autenticação
- ✅ **Validação de formato JWT** antes de processar
- ✅ **Correção na chamada getUser()** do Supabase  
- ✅ **Tratamento de erro melhorado** com logs estruturados
- ✅ **Prevenção de vazamento de dados** nos logs

---

## 📋 PASSO A PASSO - CONFIGURAÇÃO DO SUPABASE

### 1️⃣ Criando o Projeto Supabase (5 minutos)

```bash
# 1. Acesse https://supabase.com/
# 2. Clique em "Start your project"
# 3. Faça login/cadastro (GitHub recomendado)
# 4. Clique "New project"
```

**Configurações do projeto:**
- **Organization:** Sua organização pessoal
- **Name:** `catbutler-backend` 
- **Database Password:** Use senha forte (salve no gerenciador!)
- **Region:** Escolha mais próxima (ex: South America - São Paulo)
- **Pricing:** Free (0$/month - perfeito para começar)

⏳ **Aguarde 2-3 minutos** para o projeto ser criado.

### 2️⃣ Executando o Schema do Banco (10 minutos)

**PASSO 1: Acesse o SQL Editor**
1. No painel do Supabase, vá em **"SQL Editor"**
2. Clique **"+ New query"**  
3. Cole TODO o conteúdo de `supabase/schema.sql`
4. Clique **"Run"** (botão azul no canto inferior direito)

**⚠️ IMPORTANTE:** Se der erro, execute por partes:

```sql
-- PARTE 1: Extensões e tabelas básicas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Depois execute o resto do schema...
```

**PASSO 2: Verificar se funcionou**

Execute esta query para testar:

```sql
-- Teste rápido: deve retornar as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'tasks', 'events', 'activities');
```

**Resultado esperado:**
```
user_profiles
tasks  
events
activities
```

### 3️⃣ Configurar Storage (5 minutos) - OPCIONAL

```bash
# No painel Supabase:
# 1. Vá em "Storage"
# 2. Clique "Create bucket" 
# 3. Nome: uploads
# 4. Public: DESATIVADO (privado)
# 5. Clique "Create bucket"
```

### 4️⃣ Obter Credenciais (2 minutos)

```bash
# No painel Supabase:
# 1. Vá em "Settings" > "API"
# 2. Copie as informações:
```

**📋 Anote estas informações:**

```env
# Project URL (exemplo)
SUPABASE_URL=https://supabase.com/dashboard/project/htmcbeidfvjjmwsuahdq

# anon/public key (exemplo - bem longo)  
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZi...

# service_role key (OPCIONAL - para uploads)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1jZC...
```

---

## 🔧 CONFIGURAÇÃO LOCAL

### 5️⃣ Configurar Variáveis de Ambiente (3 minutos)

```bash
# Navegue para o diretório do projeto
cd /Users/Izadora1/Desktop/programacao/projetos/catbutler/catbutler-backend

# Edite o arquivo .env.local
nano .env.local

# OU use VSCode
code .env.local
```

**Preencha com SUAS credenciais reais:**

```env
# === SUAS CREDENCIAIS AQUI ===
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SEU_TOKEN_AQUI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SEU_SERVICE_ROLE_AQUI...

# === CONFIGURAÇÕES LOCAIS ===
ALLOWED_ORIGIN=http://localhost:5173
SUPABASE_STORAGE_BUCKET=uploads
NODE_ENV=development
LOG_LEVEL=debug
```

### 6️⃣ Teste Local Completo (5 minutos)

```bash
# Verificar tipos TypeScript
npm run type-check

# Iniciar servidor (escolha uma opção):

# OPÇÃO A: Servidor simples (recomendado para começar)
npm run dev:simple

# OPÇÃO B: Vercel dev (mais completo, precisa auth)
npm run dev
```

**Teste de saúde:**

```bash
# Em outro terminal, teste:
curl http://localhost:3000/api/health

# Resultado esperado:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-09-15T23:57:24.896Z",
    "services": {
      "database": "connected",
      "environment": "configured"
    }
  }
}
```

---

## 🧪 TESTANDO A AUTENTICAÇÃO

### 7️⃣ Criar Usuário de Teste (5 minutos)

**No painel do Supabase:**

```bash
# 1. Vá em "Authentication" > "Users"
# 2. Clique "Add user"
# 3. Preencha:
```

- **Email:** `teste@catbutler.com`
- **Password:** `123456789` (temporária)
- **Email Confirm:** ✅ Ativado

### 8️⃣ Testar Login via Frontend (Recomendado)

**Se você já tem o frontend funcionando:**

```javascript
// No seu frontend React
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://SEU_PROJECT_ID.supabase.co',
  'SEU_ANON_KEY'
)

// Login de teste
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'teste@catbutler.com',
  password: '123456789'
})

console.log('Session:', data.session?.access_token)
```

### 9️⃣ Testar API com Token (Avançado)

```bash
# Use o token obtido no passo anterior:
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Teste perfil do usuário
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/profile

# Resultado esperado: auto-criação do perfil
{
  "success": true,
  "data": {
    "id": "uuid-do-usuario",
    "display_name": "teste",
    "theme": "auto",
    "created_at": "2025-09-15T...",
    "updated_at": "2025-09-15T..."
  }
}
```

---

## 🚀 DEPLOY NO VERCEL

### 🔟 Deploy Automático (10 minutos)

**PASSO 1: Prepare o repositório**

```bash
# Fazer commit das mudanças
git add .
git commit -m "feat: catbutler backend with security fixes"
git push origin main
```

**PASSO 2: Conecte no Vercel**

```bash
# 1. Acesse https://vercel.com/dashboard
# 2. Clique "Add New..." > "Project"
# 3. Import Git Repository 
# 4. Escolha seu repositório catbutler
# 5. Configure:
```

- **Framework Preset:** Other
- **Root Directory:** `catbutler-backend`
- **Build Command:** `npm run build`
- **Output Directory:** (deixe vazio)

**PASSO 3: Configure Environment Variables**

```bash
# No Vercel, em Settings > Environment Variables, adicione:
```

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://SEU_PROJECT_ID.supabase.co` | All |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | All |
| `ALLOWED_ORIGIN` | `https://seu-frontend.vercel.app` | Production |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | Development |
| `SUPABASE_STORAGE_BUCKET` | `uploads` | All |

**PASSO 4: Deploy**

```bash
# Clique "Deploy" no Vercel
# Aguarde 2-3 minutos

# Teste a URL gerada:
curl https://seu-projeto.vercel.app/api/health
```

---

## 🎯 PRÓXIMOS PASSOS

### ✅ CHECKLIST - VALIDAÇÃO COMPLETA

- [ ] ✅ **Supabase configurado** (schema executado)
- [ ] ✅ **Credenciais obtidas** e salvas seguramente  
- [ ] ✅ **Backend local funcionando** (health check OK)
- [ ] ✅ **Usuário de teste criado**
- [ ] ✅ **Autenticação testada** 
- [ ] ✅ **Deploy no Vercel** realizado
- [ ] ✅ **Frontend conectado** ao backend

### 🚀 IMPLEMENTAR PRÓXIMAS FEATURES

**SEMANA 1: CRUD de Tarefas**
```bash
# Próximos endpoints a implementar:
GET    /api/tasks           # Listar tarefas
POST   /api/tasks           # Criar tarefa
GET    /api/tasks/:id       # Buscar tarefa específica
PUT    /api/tasks/:id       # Atualizar tarefa
DELETE /api/tasks/:id       # Excluir tarefa
```

**SEMANA 2: CRUD de Eventos**
```bash
# Endpoints de agenda:
GET    /api/events          # Listar eventos
POST   /api/events          # Criar evento
GET    /api/events/:id      # Buscar evento específico
PUT    /api/events/:id      # Atualizar evento
DELETE /api/events/:id      # Excluir evento
```

**SEMANA 3: Feed de Atividades**
```bash
# Sistema de atividades:
GET    /api/activities      # Feed de atividades do usuário
GET    /api/stats/overview  # Estatísticas e resumos
```

---

## 🆘 TROUBLESHOOTING

### ❌ Erro: "Database connection failed"

**Solução:**
```sql
-- Teste no SQL Editor do Supabase:
SELECT version();

-- Se falhar:
-- 1. Verifique se SUPABASE_URL está correto
-- 2. Verifique se SUPABASE_ANON_KEY está correto  
-- 3. Confirme que o schema foi executado
```

### ❌ Erro: "Authentication required"

**Solução:**
```bash
# Verifique o token JWT:
# 1. Token deve começar com 'Bearer '
# 2. Token deve ter pelo menos 100 caracteres
# 3. Usuário deve existir no Supabase Auth
```

### ❌ Erro: "CORS policy"

**Solução:**
```env
# No .env.local e Vercel:
ALLOWED_ORIGIN=https://seu-frontend-real.vercel.app

# Para desenvolvimento:
ALLOWED_ORIGIN=http://localhost:5173
```

### 📞 **SUPORTE ADICIONAL**

- 📖 [Documentação Supabase](https://supabase.com/docs)
- 🔗 [Vercel Functions](https://vercel.com/docs/functions)  
- 📚 [Guia de Desenvolvimento](./DEVELOPMENT.md)

---

## 🏆 PARABÉNS!

### Você agora tem:
- ✅ **Backend profissional** com segurança enterprise
- ✅ **Banco de dados** com RLS configurado
- ✅ **API REST** moderna e escalável
- ✅ **Deploy automático** no Vercel
- ✅ **Base sólida** para expandir

### 📈 **METRICS DE SUCESSO:**
- ⚡ **99.9% uptime** com Vercel + Supabase
- 🔐 **Segurança máxima** com RLS e JWT
- 🚀 **Performance otimizada** com caching automático
- 📊 **Monitoramento** completo via dashboards

**Need help?** Entre em contato! 🐱✨