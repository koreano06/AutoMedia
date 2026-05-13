# Fluxo Principal da Plataforma

Este documento organiza o fluxo do AutoMedia antes da entrada do backend próprio.

## 1. Entrada do Produto

- O usuário cria um produto por nome, link ou imagem.
- O frontend já registra campos de origem, categoria, preço, descrição e status.
- Backend futuro: analisar produto, normalizar dados e gerar job `product_analysis`.

## 2. Biblioteca de Mídia

- Mídias são catalogadas por produto, tipo, origem, qualidade e status.
- A biblioteca suporta revisão, seleção múltipla, upload manual e preparação para IA.
- Backend futuro: storage em nuvem, coleta externa, análise de qualidade e deduplicação.

## 3. Geração de Vídeos

- O estúdio seleciona produto, mídias, template, formato, briefing e plataforma.
- O roteiro pode ser criado antes do vídeo.
- Backend futuro: job `video_generation`, renderização, storage, logs e retry.

## 4. Aprovação

- A mesa de revisão avalia score, checklist, legenda, destino e agendamento.
- Rejeição registra motivo e observações.
- Backend futuro: trilha de auditoria, versionamento e permissões de aprovador.

## 5. Agendamento

- Calendário editorial distribui posts e alerta conflitos.
- Conteúdos aprovados entram em fila “pronto para agendar”.
- Backend futuro: scheduler, cron/filas, limites por plataforma e retry.

## 6. Publicações

- Centro pós-publicação monitora status, erros, links e métricas.
- Backend futuro: APIs oficiais, sincronização de métricas, webhooks e logs técnicos.

## 7. Comentários

- Central identifica intenção de compra, riscos e respostas pendentes.
- Backend futuro: webhooks/polling, resposta automática e regras anti-spam.

## 8. Comercial

- O módulo comercial conecta produtos, estoque, margem, fornecedores e leads de compra.
- Ele ajuda a decidir quais produtos devem receber mais campanhas.
- Alertas comerciais evitam divulgar produto sem estoque, margem baixa ou fornecedor indefinido.
- Backend futuro: estoque sincronizado com marketplace, CRM leve e campanhas comerciais.

## 9. Relatórios

- Painel executivo consolida alcance, engajamento, plataformas e produtos.
- Backend futuro: agregações persistidas, relatórios exportáveis e histórico temporal.
