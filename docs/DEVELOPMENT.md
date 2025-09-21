# 💻 Guia de Desenvolvimento - CatButler Backend

![CatButler Logo](../logo-catbutler.webp)

## 🚀 Configuração do Ambiente de Desenvolvimento

### 📋 Checklist de Preparação

- [ ] Node.js 18+ instalado
- [ ] npm ou yarn configurado
- [ ] VSCode (recomendado) com extensões TypeScript
- [ ] Conta Supabase criada
- [ ] Projeto Supabase configurado
- [ ] Vercel CLI instalado (opcional)

### 🛠️ Configuração Passo a Passo

#### 1. Preparação do Ambiente

```bash
# Clone o projeto (se ainda não fez)
git clone <repository-url>
cd catbutler-backend

# Instale dependências
npm install

# Instale Vercel CLI (para desenvolvimento local)
npm install -g vercel
```

#### 2. Configuração do Supabase

1. **Crie um novo projeto** no [Supabase Dashboard](https://supabase.com/dashboard)
2. **Execute o schema**:
   - Vá em SQL Editor no painel do Supabase
   - Copie e execute todo o conteúdo de `supabase/schema.sql`
3. **Obtenha as credenciais**:
   - Settings > API
   - Copie `URL` e `anon/public key`
   - Para uploads, copie também a `service_role key`

#### 3. Configure Variáveis de Ambiente

```bash
# Copie o template
cp .env.example .env.local

# Preencha com suas credenciais reais
vim .env.local
```

Valores necessários:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
ALLOWED_ORIGIN=http://localhost:5173
NODE_ENV=development
```

#### 4. Teste a Configuração

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Teste o health check
curl http://localhost:3000/api/health

# Deve retornar algo como:
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "connected",
      "environment": "configured"
    }
  }
}
```

## 🏗️ Arquitetura do Código

### 📂 Organização de Arquivos

```
api/
├── _lib/                    # 🔧 Biblioteca compartilhada
│   ├── auth.ts             # 🔐 Middleware de autenticação
│   ├── cors.ts             # 🌐 Configuração CORS
│   ├── rateLimit.ts        # ⚡ Limitação de taxa
│   ├── response.ts         # 📤 Helpers de resposta
│   ├── supabase.ts         # 🗄️ Cliente do banco
│   ├── types.ts            # 📝 Definições de tipos
│   ├── utils.ts            # 🛠️ Utilitários gerais
│   └── validation.ts       # ✅ Esquemas de validação
├── health.ts               # 🏥 Health check
└── [modulo]/               # 📁 Módulos específicos
    ├── index.ts            # GET/POST principal
    ├── [id].ts             # GET/PUT/DELETE por ID
    └── [action].ts         # Ações específicas
```

### 🔧 Padrões de Desenvolvimento

#### 1. Estrutura de Endpoint

```typescript
/**
 * Template para novos endpoints
 */
import type { VercelResponse } from '@vercel/node'
import { 
  withAuth,
  withCors,
  rateLimit,
  sendSuccess,
  sendError,
  // outros helpers...
} from '../_lib/index.js'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // 1. Validar método HTTP
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed')
  }
  
  // 2. Validar parâmetros
  const { data, error } = validateQueryParams(schema, req.query)
  if (error) {
    return sendValidationError(res, 'Invalid parameters', error.issues)
  }
  
  // 3. Operação principal
  try {
    const result = await performOperation(req.user.id, data)
    return sendSuccess(res, result)
  } catch (error) {
    console.error('[Module] Error:', error)
    return sendInternalError(res, 'Operation failed')
  }
}

// Aplicar middlewares
export default withCors(
  rateLimit()(
    withAuth(handler)
  )
)
```

#### 2. Validação com Zod

```typescript
// Em validation.ts
export const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta']),
})

// No endpoint
const { data, error } = validateBody(createItemSchema, req.body)
if (error || !data) {
  return sendValidationError(res, 'Invalid data', error?.issues)
}
```

#### 3. Operações no Banco

```typescript
// Sempre use o cliente com token do usuário
const supabase = createUserSupabaseClient(token)

// RLS garante que só dados do usuário são acessados
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId) // Redundante, mas explícito

// Sempre trate erros adequadamente
if (error) {
  console.error('[Module] Database error:', error)
  return sendInternalError(res, 'Database operation failed')
}
```

#### 4. Logging de Atividades

```typescript
// Para operações importantes, registre atividade
await supabase
  .from('activities')
  .insert({
    actor_id: userId,
    verb: 'created', // created, updated, deleted, completed
    object_type: 'task',
    object_id: newRecord.id,
    metadata: {
      title: newRecord.title,
      timestamp: new Date().toISOString(),
    },
  })
```

## 🧪 Testando Durante o Desenvolvimento

### 🔍 Ferramentas Recomendadas

- **Thunder Client** (extensão VSCode)
- **Insomnia** ou **Postman**
- **curl** para testes rápidos

### 📝 Scripts de Teste

#### Health Check
```bash
curl -X GET http://localhost:3000/api/health
```

#### Com Autenticação
```bash
# Primeiro, obtenha um token válido do frontend
TOKEN="seu_token_aqui"

curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/profile
```

#### Criar Recurso
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Teste", "priority": "alta"}' \
  http://localhost:3000/api/tasks
```

### 🐛 Debugging

#### Logs Estruturados
```typescript
// Use console.log estruturado
console.log(`[ModuleName] Operation started`, {
  userId,
  operation: 'create_task',
  timestamp: new Date().toISOString(),
})

// Para erros, sempre inclua contexto
console.error('[ModuleName] Operation failed:', error, {
  userId,
  input: safePrint(data), // Remove dados sensíveis
  stack: error.stack,
})
```

#### Vercel Logs
```bash
# Visualize logs em tempo real
vercel logs --follow

# Ou acesse no dashboard
# https://vercel.com/dashboard/[seu-projeto]/functions
```

## 📊 Banco de Dados

### 🔗 Conexão e RLS

```sql
-- Sempre teste suas políticas RLS
-- No SQL Editor do Supabase:

-- Teste se usuário só vê próprios dados
SELECT auth.uid(); -- Verifica ID do usuário atual
SELECT * FROM tasks; -- Deve mostrar só tarefas do usuário
```

### 📋 Migrações

Para mudanças no schema:

1. **Crie um arquivo de migração**:
```sql
-- supabase/migrations/002_add_new_feature.sql
ALTER TABLE tasks ADD COLUMN tags TEXT[];
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);
```

2. **Teste localmente**:
   - Execute no SQL Editor
   - Teste com dados reais

3. **Aplique em produção**:
   - Execute no ambiente de produção
   - Monitore logs por erros

### 🔍 Consultas Úteis

```sql
-- Verificar RLS ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Ver políticas RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Estatísticas rápidas
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM events) as total_events
FROM user_profiles;
```

## 🚀 Deploy e Produção

### 📦 Preparação para Deploy

1. **Verifique tipos**:
```bash
npm run type-check
```

2. **Teste build**:
```bash
npm run build
```

3. **Configure variáveis no Vercel**:
   - Acesse Vercel Dashboard
   - Settings > Environment Variables
   - Adicione TODAS as variáveis necessárias

### 🔧 Configuração do Vercel

```json
// vercel.json (já configurado)
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3"
    }
  }
}
```

### 📈 Monitoramento

- **Logs**: Vercel Dashboard > Functions > View Logs
- **Performance**: Monitore tempo de resposta
- **Erros**: Configure alertas para 5xx errors

## 🎯 Próximos Passos

### 🔄 Implementando Novos Módulos

1. **Crie o diretório**: `api/novo-modulo/`
2. **Implemente endpoints**: `index.ts`, `[id].ts`, etc.
3. **Adicione validação**: Novos schemas em `validation.ts`
4. **Teste localmente**: Use scripts de teste
5. **Documente**: Atualize README e esta documentação

### 📚 Referências Úteis

- [Vercel Functions](https://vercel.com/docs/functions)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Dúvidas?** Consulte a documentação ou abra uma issue! 🚀