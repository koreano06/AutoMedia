# AutoMedia Frontend

Interface web do AutoMedia, uma plataforma para transformar anúncios base em criativos, vídeos de divulgação e publicações agendadas para redes sociais.

O frontend conversa com o backend próprio do AutoMedia e cobre o fluxo principal do produto: cadastro de anúncio, biblioteca de mídia, geração de vídeo com IA, aprovação, agendamento, publicações, comentários, integrações e visão comercial.

## Status Atual

- Frontend em React/Vite com layout responsivo para desktop, tablet e mobile.
- Comunicação com backend via `VITE_API_BASE_URL`.
- Fluxo de geração de vídeo preparado para enviar briefing, template, formato, duração, mídia base e plataformas.
- Biblioteca de mídia e previews padronizados em modais amplos e legíveis.
- Telas de anúncios, publicações e agendamento com visual profissional e responsivo.
- Integrações sociais exibidas na interface, com backend preparado para modo `mock` e `live`.

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

Para usar o backend em produção:

```env
VITE_API_BASE_URL=https://auto-media-backend.vercel.app/api
```

3. Inicie o frontend:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:5173
```

5. Usuário local inicial:

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
npm run typecheck  # valida TypeScript
```

## Deploy no Vercel

Configuração recomendada:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Variável principal:

```env
VITE_API_BASE_URL=https://auto-media-backend.vercel.app/api
```

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

- O login atual ainda é local para desenvolvimento da interface.
- A geração real de vídeo depende do backend com Redis, worker e FFmpeg.
- O frontend não deve armazenar chaves sensíveis, como OpenAI, Shopee, Meta ou TikTok.
- Credenciais de APIs ficam somente no backend/Vercel.

## Documentação Interna

- `docs/API_CONTRACT.md`: contrato inicial da API.
- `docs/PRODUCT_FLOW.md`: fluxo completo do produto.
- `docs/BACKEND_PLAN.md`: plano de backend.
- `docs/FRONTEND_READINESS.md`: pontos de prontidão do frontend.
- `docs/PROJECT_STRUCTURE.md`: organização do projeto.
