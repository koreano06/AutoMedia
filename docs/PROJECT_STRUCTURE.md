# Estrutura do Projeto

```text
.
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── api/
│   │   └── httpClient.ts
│   ├── app/
│   │   ├── providers/
│   │   ├── AppRouter.tsx
│   │   └── routes.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   └── ui/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.js
```

## Pastas

- `public`: arquivos estáticos servidos diretamente pelo Vite.
- `src/api`: clientes de API e integrações externas.
- `src/app`: composição da aplicação, providers globais e definição das rotas.
- `src/components/common`: componentes reutilizáveis específicos do produto.
- `src/components/layout`: estrutura visual compartilhada, como sidebar e topbar.
- `src/components/ui`: componentes base do design system.
- `src/config`: configurações estáticas do produto, como navegação e metadados.
- `src/hooks`: hooks reutilizáveis.
- `src/lib`: utilitários, contexto de autenticação e configuração de runtime.
- `src/pages`: telas roteadas pelo React Router.
- `src/services`: funções de acesso a dados e integrações usadas pelas páginas.
- `src/types`: tipos compartilhados por serviços, componentes e páginas.

## Convenções

- Use `@/` para imports a partir de `src`.
- Mantenha `src/App.tsx` pequeno; novas rotas devem entrar em `src/app/routes.tsx`.
- Mantenha providers globais em `src/app/providers`.
- Mantenha menus e configurações estáticas em `src/config`.
- Coloque telas novas em `src/pages`.
- Coloque componentes genéricos do produto em `src/components/common`.
- Coloque integrações e clientes externos em `src/api`.
- Coloque chamadas de entidades/API em `src/services`; páginas devem consumir serviços.
- Evite editar componentes em `src/components/ui` sem necessidade; eles funcionam como biblioteca base.
