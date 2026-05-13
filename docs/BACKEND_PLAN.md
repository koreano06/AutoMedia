# Plano de Backend

## Objetivo

Substituir a dependência técnica atual por uma API própria, com autenticação segura, jobs assíncronos, storage e integrações oficiais.

## Módulos Prioritários

1. **Auth e usuários**

- Login com usuário/senha.
- Senha com hash forte.
- Sessão via JWT ou cookie seguro.
- Papéis: `admin`, `operator`, `reviewer`, `analyst`.

2. **Produtos**

- CRUD de produtos.
- Análise por imagem/link.
- Histórico por produto.
- Associação com mídias, vídeos, posts e comentários.

3. **Storage e mídia**

- Upload para S3/GCS/Blob.
- Registro de metadados.
- Análise de qualidade.
- Deduplicação e controle de origem.

4. **Jobs**

- Fila para tarefas longas.
- Estados: `queued`, `processing`, `completed`, `failed`, `cancelled`.
- Logs por job.
- Retry e cancelamento.

5. **Vídeos**

- Roteiro IA.
- Renderização programática ou API de vídeo.
- Versionamento de vídeos.
- Score de qualidade.

6. **Aprovação**

- Checklist persistido.
- Motivos de rejeição.
- Histórico de revisão.
- Permissões por usuário.

7. **Agendamento e publicação**

- Scheduler real.
- Limites por plataforma.
- OAuth e tokens seguros.
- Retry automático.
- Logs de API.

8. **Comentários**

- Webhooks/polling por plataforma.
- Detecção de intenção.
- Resposta automática com regras.
- Auditoria de respostas.

9. **Relatórios**

- Agregações por período.
- Métricas por plataforma/produto/campanha.
- Exportação CSV/PDF.

10. **Comercial / ERP leve**

- Estoque por produto.
- SKU, custo, margem e fornecedor.
- Leads originados de comentários.
- Campanhas comerciais conectadas a produtos.
- Alertas de estoque, margem baixa e link/preço desatualizado.

## Stack Sugerida

- Node.js/NestJS ou Fastify.
- PostgreSQL.
- Redis/Queue.
- Storage S3 compatível.
- Worker separado para IA/renderização/publicação.

## Primeira Entrega Recomendada

1. Auth real.
2. CRUD de produtos.
3. Upload de imagem.
4. Jobs assíncronos básicos.
5. Endpoints de mídia e vídeo mockados.
6. Agendamento com posts locais.
7. Módulo comercial com estoque, margem e leads.
