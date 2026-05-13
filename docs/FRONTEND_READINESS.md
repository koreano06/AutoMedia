# Preparação do Frontend

## Pronto para Backend

- Login local existe apenas como placeholder.
- Serviços já estão isolados em `src/services`.
- Tipos de domínio estão centralizados em `src/types/entities.ts`.
- Contratos iniciais estão em `docs/API_CONTRACT.md`.
- Telas principais já usam estados compatíveis com jobs, aprovação, publicação e comentários.

## Pontos de Troca Quando o Backend Entrar

- `src/lib/AuthContext.tsx`: trocar localStorage por API real.
- `src/api/base44Client.ts`: remover SDK legado gradualmente.
- `src/services/*`: apontar todos para `apiClient`.
- `src/lib/NotificationContext.tsx`: consumir endpoint de notificações/summary.
- Uploads: substituir preview local por storage real.

## Componentes Reutilizáveis Criados

- `MetricCard`: card padrão de indicador.
- `PageToolbar`: wrapper para filtros e ações.
- `EmptyState`: estado vazio padronizado.
- `StatusBadge`: status visual compartilhado.
- `JobStatusBadge`: status de jobs.
- `PlatformIcon`: identidade de plataformas.

## Regras de Organização

- Páginas devem conter composição e estado de tela.
- Serviços devem concentrar acesso a dados.
- Tipos devem ficar em `src/types`.
- Componentes comuns devem ir para `src/components/common`.
- Componentes shadcn/base devem permanecer em `src/components/ui`.

## Próximos Refactors Recomendados

- Migrar cards de métricas existentes para `MetricCard`.
- Migrar barras de filtro para `PageToolbar`.
- Criar `DataTable` compartilhado quando as tabelas estabilizarem.
- Criar `PreviewDialog` compartilhado para mídias, posts e vídeos.
