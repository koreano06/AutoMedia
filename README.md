# AutoMedia

Dashboard para automação de marketing, geração de mídia, aprovação de conteúdos, agendamento de publicações e acompanhamento de comentários.

## Tecnologias

- React 18
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- SDK de backend integrado

## Como Rodar Localmente

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_APP_ID=seu_app_id
VITE_APP_BASE_URL=https://seu-backend.app
VITE_API_BASE_URL=/api
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Abra a URL mostrada no terminal. Por padrão, o Vite costuma usar:

```text
http://localhost:5173
```

5. Entre com o usuário local inicial:

```text
usuário: admin
senha: admin123
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run typecheck
```

## Estrutura

```text
src/
  api/          Cliente e integrações de API
  components/   Componentes comuns, layout e biblioteca de UI
  hooks/        Hooks compartilhados
  lib/          Utilitários, contexto de autenticação e configuração
  pages/        Telas principais do produto
  services/     Acesso a dados e integrações por domínio
  types/        Tipos compartilhados e contratos
  App.tsx       Rotas da aplicação
  main.tsx      Entrada do React
  index.css     Tema global e Tailwind
```

## Observações

O login atual é local e serve para desenvolvimento do frontend. Quando o backend próprio entrar, ele deve ser substituído por autenticação real com senha criptografada, sessão protegida e controle de permissões.

As variáveis `VITE_APP_ID` e `VITE_APP_BASE_URL` configuram o backend usado como fonte de dados. O plugin visual da plataforma não é carregado no Vite, evitando overlays, notificadores e marcas visuais no frontend.

O painel possui modo claro/escuro com preferência salva localmente, acessível pelo botão de sol/lua no topo.

Documentação útil:

- `docs/API_CONTRACT.md`: contrato inicial da API própria.
- `docs/PRODUCT_FLOW.md`: fluxo completo do produto na plataforma.
- `docs/BACKEND_PLAN.md`: plano de módulos do backend.
- `docs/FRONTEND_READINESS.md`: pontos de troca quando o backend entrar.

O módulo `Comercial` é um ERP leve encaixado no fluxo do AutoMedia: estoque, margem, fornecedores, leads de compra e alertas comerciais sem transformar a plataforma em um ERP tradicional completo.
