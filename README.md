# AutoMedia Frontend

Interface web do AutoMedia, uma plataforma para transformar anúncios base em criativos, vídeos de divulgação e publicações agendadas para redes sociais.

O frontend conversa com o backend próprio do AutoMedia e cobre o fluxo principal do produto: cadastro de anúncio, biblioteca de mídia, geração de vídeo com IA, aprovação, agendamento, publicações, comentários, integrações e visão comercial.

## Status Atual

- Frontend em React/Vite com layout responsivo para desktop, tablet e mobile.
- Comunicação com backend via `VITE_API_BASE_URL`, incluindo presets para local, VM, túnel e URL pública.
- Login integrado ao backend em produção usando JWT e refresh token.
- Usuário de teste disponível para validação do painel: `admin / admin123`.
- Fluxo de geração de vídeo preparado para enviar briefing, template, formato, duração, mídia base e plataformas.
- Biblioteca de mídia e previews padronizados em modais amplos e legíveis.
- Telas de anúncios, publicações e agendamento com visual profissional e responsivo.
- Integrações sociais exibidas na interface, com backend preparado para modo `mock` e `live`.

## Status das Funcionalidades

- ✅ Frontend responsivo para desktop, tablet e mobile
- ✅ Navegação com sidebar desktop e menu inferior mobile
- ✅ Dashboard, anúncios base, mídia, vídeos, aprovação e agenda
- ✅ Biblioteca de mídia com previews grandes e padronizados
- ✅ Tela de geração de vídeos com briefing, template, formato e plataformas
- ✅ Comunicação com backend próprio via `VITE_API_BASE_URL`
- ✅ Scripts para alternar API local, VM, túnel temporário e URL pública
- ✅ Fluxo visual de integrações sociais e marketplaces
- ✅ Telas comerciais/ERP leve para operação e finanças
- ✅ Cliente HTTP envia JWT automaticamente quando há sessão da API
- ✅ Tokens sensíveis de plataformas não são expostos ao frontend
- ✅ Refresh token automático quando access token expira
- ✅ Login validado contra o backend próprio com `admin / admin123`
- ✅ Testes unitários para permissões, cliente HTTP e contrato dos services
- ✅ Testes E2E com Playwright para login, shell principal, desktop e mobile
- ✅ Feedback em tempo real dos jobs de vídeo em evolução na tela de geração
- ✅ Fallback local desabilitado em produção para forçar autenticação real
- ✅ Permissões por papel em áreas e ações sensíveis da interface
- 🔜 Publicação real em redes sociais via APIs oficiais
- 🔜 Monitoramento automático de comentários em tempo real
- 🔜 Dashboard financeiro com métricas reais de vendas e ROI

## Plano de Estabilização

- ✅ 1. Consolidar ambiente de produção
- 🟡 2. Fechar Redis + Supabase Storage
- 🔜 3. Melhorar acompanhamento em tempo real dos jobs
- ✅ 4. Fortalecer autenticação e sessão
- ✅ 5. Revisar CRUDs ponta a ponta
- 🔜 6. Implementar integrações sociais live

## Plano de Segurança

- ✅ 1. Login integrado ao backend e envio automático de Bearer token
- ✅ 2. Remover fallback local em produção
- ✅ 3. Controle de sessão expirada e refresh token
- ✅ 4. Permissões por papel na interface
- 🟡 5. Máscara visual para dados sensíveis
- 🟡 6. Alertas claros para erros 401/403
- ✅ 7. Não exibir access/refresh tokens das integrações

Para validar as variáveis essenciais do frontend antes de publicar:

```bash
npm run prod:check
```

## Principais Módulos

- `Dashboard`: visão geral da operação.
- `Anúncios Base`: cadastro e gestão dos anúncios/produtos usados como origem dos criativos.
- `Biblioteca de Mídia`: imagens, vídeos coletados e criativos gerados por IA.
- `Geração de Vídeos`: briefing, roteiro, imagem IA, seleção de template e envio para fila de renderização.
- `Aprovação`: revisão manual antes de publicar.
- `Agendamento`: calendário, horários e edição de posts.
- `Publicações`: acompanhamento de posts publicados/agendados.
- `Comentários`: leitura e automação de respostas.
- `Integrações`: conexão visual com redes sociais e marketplaces.
- `Comercial`: visão leve de estoque, margem, fornecedores e vendas.
- `Configurações`: automações, horários e palavras-chave.

## Stack

- React 18
- Vite 6
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router
- TanStack Query
- Sonner
- Recharts
- Lucide React

## Requisitos

- Node.js 20 ou superior recomendado.
- Backend AutoMedia rodando localmente ou publicado.
- Arquivo `.env.local` configurado.

## Como Rodar Localmente

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local` na raiz do frontend:

```env
VITE_APP_ID=automedia
VITE_APP_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3333/api
```

Para alternar rapidamente a API local:

```bash
npm run api:local
```

Para usar o backend da VM dentro da sua rede:

```bash
npm run api:vm
```

Para usar uma URL pública com HTTPS, como domínio ou tunnel:

```bash
npm run api:public -- https://api.seudominio.com
```

O script cria `.env.local` com `/api` no final automaticamente quando necessário.

Para usar o backend em produção na Vercel, configure a variável no painel do projeto:

```env
VITE_API_BASE_URL=https://api.seudominio.com/api
```

3. Inicie o frontend:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:5173
```

5. Usuário de teste inicial:

```text
usuario: admin
senha: admin123
```

## Scripts

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm run preview    # preview local do build
npm run lint       # valida ESLint
npm run lint:fix   # corrige lint quando possível
npm run prod:check # valida variáveis essenciais de produção
npm run api:local  # aponta .env.local para http://localhost:3333/api
npm run api:vm     # aponta .env.local para http://192.168.1.6:3333/api
npm run api:public -- https://api.seudominio.com # aponta para URL pública HTTPS
npm run test       # testes unitários/contrato com Vitest
npm run test:e2e   # testes E2E com Playwright
npm run check:errors # roda validações e mostra apenas erros
npm run typecheck  # valida TypeScript
```

## Testes e Qualidade

Validação recomendada antes de publicar:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Para uma saída limpa que mostra somente falhas:

```bash
npm run --silent check:errors
```

Para pular o E2E nessa validação rápida:

```powershell
$env:SKIP_E2E="true"; npm run --silent check:errors; Remove-Item Env:SKIP_E2E
```

Validação visual/fluxo principal:

```bash
npx playwright install chromium
npm run test:e2e
```

O E2E cobre login com `admin / admin123`, abertura do painel, rotas principais e execução em desktop e mobile.

## Deploy no Vercel

Configuração recomendada:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Variável principal:

```env
VITE_API_BASE_URL=https://api.seudominio.com/api
```

Importante: o frontend publicado na Vercel não consegue acessar `192.168.1.6` fora da sua rede. Para produção, use domínio/tunnel HTTPS apontando para a VM.

O arquivo `vercel.json` mantém o roteamento SPA funcionando em rotas internas como `/products`, `/media`, `/videos`, `/schedule`, `/publications` e `/settings`.

## Estrutura

```text
src/
  app/          Providers e rotas centrais
  components/   Componentes comuns, layout e UI
  config/       Navegação, plataformas e constantes
  hooks/        Hooks reutilizáveis
  lib/          Auth local, query client e utilitários
  pages/        Telas principais da plataforma
  services/     Clientes HTTP por domínio
  types/        Tipos compartilhados com a API
  App.tsx       Composição principal
  main.tsx      Entrada React
  index.css     Tema global e Tailwind
```

## Fluxo de Vídeo com IA

1. O usuário seleciona um anúncio base.
2. Escolhe template, formato, duração, ritmo, áudio e plataforma.
3. Pode gerar roteiro e imagem IA.
4. O frontend envia tudo para `POST /api/videos/generate`.
5. O backend cria job, envia para fila e renderiza com worker/FFmpeg.
6. O vídeo volta para a biblioteca como mídia em revisão.
7. O usuário aprova, agenda e publica.

## Observações

- Em produção, o login usa o backend real com JWT.
- Em desenvolvimento, existe fallback local apenas para manter a interface utilizável quando a API não estiver disponível.
- O usuário padrão de teste do backend é `admin / admin123`.
- A geração real de vídeo depende do backend com Redis, worker e FFmpeg.
- O frontend não deve armazenar chaves sensíveis, como OpenAI, Shopee, Meta ou TikTok.
- Credenciais de APIs ficam somente no backend/Vercel.

## Documentação Interna

- `docs/API_CONTRACT.md`: contrato inicial da API.
- `docs/PRODUCT_FLOW.md`: fluxo completo do produto.
- `docs/BACKEND_PLAN.md`: plano de backend.
- `docs/FRONTEND_READINESS.md`: pontos de prontidão do frontend.
- `docs/PROJECT_STRUCTURE.md`: organização do projeto.
