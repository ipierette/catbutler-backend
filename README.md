# 🐱 CatButler Backend

![CatButle## ✨ Features

- 🔐 **Autenticação JWT** via Supabase Auth
- 🛡️ **Row Level Security** para isolamento de dados
- ⚡ **Serverless** com auto-scaling na Vercel
- 📈 **Real-time** updates via Supabase Realtime
- ✅ **Validação robusta** com esquemas Zod
- 📈 **Logs estruturados** para debugging
- 🌐 **CORS configurável** para múltiplos ambientes
- ⏱️ **Rate limiting** por endpoint
- 🤖 **Sistema IA Multi-API** com fallback inteligente
- 🎨 **Gemini Integration** para conteúdo criativo
- ⚡ **GROQ Integration** para chat conversacional
- 🤖 **HuggingFace Integration** para análise e fallbacklogo-catbutle

>## 📁 Estrutura do Projeto

```
catbutler-backend/
├── api/                    # 🚀 Endpoints da API
│   ├── _lib/              # 📋 Biblioteca compartilhada
│   │   ├── tradutor-cozinha.js    # Tradução PT-BR
│   │   ├── banco-receitas.js      # Cache local
│   │   └── supabase.js            # Cliente Supabase
│   ├── health.ts          # 🏥 Health check
│   ├── auth/              # 🔐 Autenticação
│   ├── profile/           # 👤 Gerenciar perfil
│   ├── kitchen/           # 🍳 APIs da Cozinha IA
│   │   ├── suggestions.ts # Receitas (Gemini + fallback)
│   │   └── chat.ts        # Chat Chef (GROQ + fallback)
│   ├── market/            # 🛒 Mercado IA (HuggingFace)
│   ├── cleaning/          # 🧹 Faxina IA (Gemini)
│   ├── tasks/             # ✅ Tarefas (futuro)
│   ├── events/            # 📅 Eventos (futuro)
│   └── activities/        # 📈 Feed (futuro)
├── docs/                  # 📖 Documentação
│   ├── README.md
│   ├── DEVELOPMENT.md
│   └── SETUP_COMPLETO.md
├── supabase/              # 🗄️ Schema do banco
│   ├── schema.sql
│   └── migrations/
├── scripts/               # 🛠️ Scripts úteis
│   ├── dev-server.js
│   └── simple-test.js
└── package.json
```na para o sistema de produtividade pessoal CatButler**
> 
> Construída com TypeScript, Vercel Functions e Supabase

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-000000.svg)](https://vercel.com)
[![Database](https://img.shields.io/badge/database-supabase-3ecf8e.svg)](https://supabase.com)
[![Language](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## 🚀 Início Rápido

```bash
# 1. Clone e instale dependências
git clone <repository-url>
cd catbutler-backend
npm install

# 2. Configure ambiente
cp .env.example .env.local
# Preencha com suas credenciais do Supabase

# 3. Execute o banco de dados
# Execute supabase/schema.sql no seu projeto Supabase

# 4. Inicie desenvolvimento
npm run dev

# 5. Teste
curl http://localhost:3000/api/health
```

## ✨ Features

- 🔐 **Autenticação JWT** via Supabase Auth
- 🛡️ **Row Level Security** para isolamento de dados
- ⚡ **Serverless** com auto-scaling na Vercel
- 📊 **Real-time** updates via Supabase Realtime
- ✅ **Validação robusta** com esquemas Zod
- 📈 **Logs estruturados** para debugging
- 🌐 **CORS configurável** para múltiplos ambientes
- ⏱️ **Rate limiting** por endpoint

## 📋 API Endpoints

### Core
- `GET /api/health` - Status da API
- `GET /api/profile` - Perfil do usuário (auto-cria)
- `PUT /api/profile/update` - Atualiza perfil

### 🤖 Inteligência Artificial
- `POST /api/kitchen/suggestions` - Sugestões de receitas (Gemini + fallback)
- `POST /api/kitchen/chat` - Chat com chef IA (GROQ + fallback)
- `POST /api/market/suggestions` - Sugestões de compras (HuggingFace)
- `POST /api/cleaning/tips` - Dicas de limpeza (Gemini + fallback)

### Em Desenvolvimento
- `GET|POST /api/tasks` - Gerenciar tarefas
- `GET|POST /api/events` - Gerenciar eventos
- `GET /api/activities` - Feed de atividades

## 🏗️ Stack Tecnológica

### **Backend Core**
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Platform**: Vercel Functions
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Validation**: Zod
- **Real-time**: Supabase Realtime

### **🤖 Inteligência Artificial**
- **🎨 Gemini API** - Google Generative AI para conteúdo criativo
- **⚡ GROQ API** - Chat conversacional com modelo Llama3-8b
- **🤖 HuggingFace** - Análise de texto e fallback universal
- **🛡️ Sistema Fallback** - Garantia de 99.9% uptime

### **🌐 APIs Externas**
- **TheMealDB** - Base de receitas gratuitas
- **Supabase Real-time** - Sincronização de dados
- **Vercel Edge Network** - CDN global

## 📁 Estrutura do Projeto

```
catbutler-backend/
├── api/                    # 🚀 Endpoints da API
│   ├── _lib/              # 📚 Biblioteca compartilhada
│   ├── health.ts          # 🏥 Health check
│   ├── profile/           # 👤 Gerenciar perfil
│   ├── tasks/             # ✅ Tarefas (futuro)
│   ├── events/            # 📅 Eventos (futuro)
│   └── activities/        # 📊 Feed (futuro)
├── docs/                  # 📖 Documentação
├── supabase/              # 🗄️ Schema do banco
│   └── schema.sql
├── scripts/               # 🛠️ Scripts úteis
└── package.json
```

## 🛠️ Desenvolvimento

### Configuração Local

1. **Supabase Setup**:
   - Crie projeto no [Supabase](https://supabase.com)
   - Execute `supabase/schema.sql`
   - Copie credenciais para `.env.local`

2. **Desenvolvimento**:
   ```bash
   npm run dev          # Servidor local
   npm run type-check   # Verificar tipos
   npm run build        # Build de produção
   ```

3. **Testing**:
   ```bash
   # Health check
   curl http://localhost:3000/api/health
   
   # Com autenticação
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3000/api/profile
   ```

### Padrões de Código

- ✅ TypeScript rigoroso
- ✅ Validação Zod em todos os inputs
- ✅ RLS no banco de dados
- ✅ Logs estruturados
- ✅ Tratamento consistente de erros

## 🔐 Segurança

- **Authentication**: Bearer tokens do Supabase Auth
- **Authorization**: Row Level Security no PostgreSQL
- **CORS**: Configurado para domínios específicos
- **Rate Limiting**: Proteção contra abuse
- **Input Validation**: Esquemas Zod rigorosos
- **Environment Variables**: Nunca commitadas no código

## 📊 Monitoramento

- **Logs**: Vercel Dashboard ou `vercel logs`
- **Errors**: Captura automática de erros 5xx
- **Performance**: Métricas de tempo de resposta
- **Database**: Health check automático

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte o repositório ao Vercel
2. Configure variáveis de ambiente
3. Deploy automático no push para `main`

### Variáveis de Ambiente

#### **⚙️ Core (Obrigatório)**
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Segurança
JWT_SECRET=seu_jwt_secret_muito_seguro
FRONTEND_URL=https://seu-frontend.vercel.app
ALLOWED_ORIGIN=https://seu-frontend.vercel.app
```

#### **🤖 APIs de IA (Opcional - Sistema tem fallbacks)**
```env
# Gemini API - Receitas criativas e conteúdo estruturado
# Obter em: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...

# GROQ API - Chat conversacional fluido
# Obter em: https://console.groq.com/keys  
GROQ_API_KEY=gsk_...

# HuggingFace - Análise e fallback universal
# Obter em: https://huggingface.co/settings/tokens
HF_TOKEN_COZINHA=hf_...     # Para funcionalidades de cozinha
HF_TOKEN_MERCADO=hf_...     # Para funcionalidades de mercado
```

#### **🔄 Como o Sistema Funciona**
- **Com APIs**: Experiência completa com IA avançada
- **Sem APIs**: Funciona normalmente com respostas padrão inteligentes
- **Fallback Automático**: Se Gemini/GROQ falharem → HuggingFace assume
- **Garantia**: 99.9% de disponibilidade independente das APIs externas

## 📚 Documentação

- 📖 [**Guia Completo**](./docs/README.md) - Documentação detalhada
- 💻 [**Desenvolvimento**](./docs/DEVELOPMENT.md) - Setup e padrões
- 🔗 [**API Reference**](./docs/API.md) - Endpoints detalhados *(em breve)*
- 🗄️ [**Database**](./supabase/schema.sql) - Schema e RLS

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Guidelines

- Siga os padrões TypeScript existentes
- Adicione validação para novos endpoints
- Mantenha logs estruturados
- Documente mudanças no README

## 🗺️ Roadmap

### ✅ Fase 1 - Fundação
- [x] Estrutura base e configuração
- [x] Autenticação e segurança
- [x] Health check e monitoramento
- [x] Perfil de usuário

### 🔄 Fase 2 - Features Core
- [ ] CRUD completo de Tarefas
- [ ] CRUD completo de Eventos
- [ ] Feed de Atividades
- [ ] Sistema de estatísticas

### 🔮 Fase 3 - Features Avançadas
- [ ] Upload de arquivos
- [ ] Integração com IA
- [ ] Jobs em background
- [ ] Notificações

## 📝 License

Este projeto está sob a licença [MIT](LICENSE).

## 🐛 Issues & Support

- 🐛 [Report Bug](issues/new?template=bug_report.md)
- 💡 [Request Feature](issues/new?template=feature_request.md)
- 💬 [Discussions](discussions)

---

<div align="center">

**Feito com ❤️ para o CatButler**

*Mantendo sua vida organizada, uma função serverless por vez* 🐱

[🚀 Deploy](https://vercel.com) | [📊 Database](https://supabase.com) | [📖 Docs](./docs/README.md)

</div>