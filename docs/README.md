# 🐱 CatButler Backend

![CatButler Logo](../logo-catbutler.webp)

## 📋 Sobre o Projeto

O CatButler Backend é uma API REST moderna construída para suportar o aplicativo de produtividade pessoal CatButler. Desenvolvido com TypeScript e implantado na Vercel, oferece funcionalidades completas para gerenciamento de tarefas, eventos, perfis de usuário e muito mais.

### ✨ Características Principais

- **🔐 Autenticação Robusta**: Integração com Supabase Auth
- **🛡️ Segurança**: RLS (Row Level Security) no banco de dados
- **⚡ Serverless**: Funções Vercel para escalabilidade automática
- **📊 Real-time**: Suporte a atualizações em tempo real
- **🎯 TypeScript**: Tipagem forte em todo o código
- **✅ Validação**: Esquemas Zod para validação de dados
- **📈 Observabilidade**: Logs estruturados e monitoramento

### 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Vercel API     │───▶│   Supabase      │
│  (React/Vite)   │    │   Functions      │    │  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   External APIs  │
                       │  (IA, Webhooks)  │
                       └──────────────────┘
```

## 🚀 Início Rápido

### 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com)
- Git configurado

### 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd catbutler-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
# Preencha .env.local com suas credenciais
```

4. **Configure o banco de dados**
   - Execute o script `supabase/schema.sql` no seu projeto Supabase
   - Configure RLS e políticas de segurança

5. **Execute em desenvolvimento**
```bash
npm run dev
```

A API estará disponível em `http://localhost:3000/api`

## 📚 Documentação da API

### 🔗 Endpoints Principais

#### Health Check
```http
GET /api/health
```
Verifica o status da API e conectividade com serviços.

#### Perfil do Usuário
```http
GET /api/profile          # Busca perfil (auto-cria se não existir)
PUT /api/profile/update   # Atualiza perfil
```

#### Tarefas (Em Desenvolvimento)
```http
GET /api/tasks           # Lista tarefas
POST /api/tasks          # Cria tarefa
GET /api/tasks/{id}      # Busca tarefa específica
PUT /api/tasks/{id}      # Atualiza tarefa
DELETE /api/tasks/{id}   # Exclui tarefa
```

#### Eventos (Em Desenvolvimento)
```http
GET /api/events          # Lista eventos
POST /api/events         # Cria evento
GET /api/events/{id}     # Busca evento específico
PUT /api/events/{id}     # Atualiza evento
DELETE /api/events/{id}  # Exclui evento
```

#### Feed de Atividades (Em Desenvolvimento)
```http
GET /api/activities      # Lista atividades do usuário
```

### 🔐 Autenticação

Todos os endpoints (exceto `/api/health`) requerem autenticação via Bearer Token:

```http
Authorization: Bearer <supabase_access_token>
```

### 📊 Formato de Resposta

Todas as respostas seguem o padrão:

```json
{
  "success": true,
  "data": {...},
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasNext": true
  }
}
```

Para erros:
```json
{
  "success": false,
  "error": {
    "message": "Descrição do erro",
    "code": "ERROR_CODE",
    "details": {...}
  }
}
```

## 🗄️ Banco de Dados

### 📋 Tabelas Principais

- **`user_profiles`**: Perfis complementares dos usuários
- **`tasks`**: Tarefas/to-dos do usuário
- **`events`**: Eventos da agenda
- **`activities`**: Log de atividades para o feed

### 🛡️ Segurança (RLS)

Todas as tabelas implementam Row Level Security:
- Usuários só podem acessar seus próprios dados
- Políticas específicas para cada operação (SELECT, INSERT, UPDATE, DELETE)
- Isolamento completo entre usuários

## 🔧 Desenvolvimento

### 📂 Estrutura do Projeto

```
catbutler-backend/
├── api/
│   ├── _lib/              # Biblioteca compartilhada
│   │   ├── auth.ts        # Middleware de autenticação
│   │   ├── cors.ts        # Configurações CORS
│   │   ├── response.ts    # Utilitários de resposta
│   │   ├── supabase.ts    # Cliente Supabase
│   │   ├── types.ts       # Tipos TypeScript
│   │   ├── utils.ts       # Utilitários gerais
│   │   └── validation.ts  # Esquemas Zod
│   ├── health.ts          # Health check
│   ├── profile/           # Endpoints de perfil
│   ├── tasks/             # Endpoints de tarefas (futuro)
│   ├── events/            # Endpoints de eventos (futuro)
│   └── activities/        # Endpoints de atividades (futuro)
├── docs/                  # Documentação
├── supabase/
│   └── schema.sql         # Schema do banco
└── scripts/               # Scripts úteis
```

### 🧪 Testando Localmente

1. **Health Check**
```bash
curl http://localhost:3000/api/health
```

2. **Com Autenticação**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/profile
```

### 📦 Deploy

1. **Configure as variáveis no Vercel**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ALLOWED_ORIGIN`

2. **Deploy automático**
   - Conecte o repositório ao Vercel
   - Push para `main` faz deploy automático

## 🤝 Contribuindo

### 🔄 Workflow de Desenvolvimento

1. Crie uma branch para sua feature
2. Implemente seguindo os padrões do projeto
3. Teste localmente
4. Faça commit com mensagens descritivas
5. Abra um Pull Request

### 📝 Padrões de Código

- **TypeScript**: Tipagem forte obrigatória
- **Imports**: Use imports relativos para código local
- **Validação**: Todo input deve ser validado com Zod
- **Errors**: Use os helpers de response padronizados
- **Logs**: Use logs estruturados para debugging

### 🔍 Checklist de PR

- [ ] Código tipado corretamente
- [ ] Validação de inputs implementada
- [ ] RLS configurado no banco (se aplicável)
- [ ] Logs adequados adicionados
- [ ] Testado localmente
- [ ] Documentação atualizada

## 🚧 Roadmap

### ✅ Fase 1 - Base (Concluída)
- [x] Estrutura inicial
- [x] Autenticação
- [x] Health check
- [x] Perfil do usuário
- [x] Banco de dados com RLS

### 🔄 Fase 2 - Core Features (Em Desenvolvimento)
- [ ] CRUD de Tarefas
- [ ] CRUD de Eventos
- [ ] Feed de Atividades
- [ ] Sistema de estatísticas

### 🔮 Fase 3 - Features Avançadas
- [ ] Upload de arquivos
- [ ] Integração IA (receitas, limpeza)
- [ ] Sistema de notificações
- [ ] Jobs em background

## 🤔 FAQ

**P: Como obter as credenciais do Supabase?**
R: Acesse seu painel no Supabase, vá em Settings > API e copie a URL e chaves necessárias.

**P: Como configurar CORS para produção?**
R: Configure `ALLOWED_ORIGIN` com seu domínio real no Vercel.

**P: Como debugar problemas de autenticação?**
R: Verifique se o token está sendo enviado corretamente e se não expirou.

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte esta documentação
2. Verifique os logs do Vercel
3. Abra uma issue no repositório

---

**Desenvolvido com ❤️ para o CatButler**

*Mantendo sua vida organizada, uma função por vez* 🐱