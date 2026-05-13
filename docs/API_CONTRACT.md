# Contrato Inicial da API

Base URL sugerida:

```text
/api
```

## Produtos

`GET /products`

Lista produtos cadastrados.

`POST /products`

Cria produto manualmente.

Body:

```json
{
  "name": "Tênis Nike Air Max",
  "source_url": "https://loja.com/produto",
  "image_url": "https://cdn.com/produto.jpg",
  "category": "Moda",
  "description": "Descrição curta",
  "brand": "Nike",
  "price": 299.9,
  "cost_price": 120,
  "sku": "SKU-001",
  "supplier_name": "Fornecedor XPTO",
  "stock_quantity": 50,
  "min_stock": 5,
  "marketplace_origin": "Shopee"
}
```

`POST /products/analyze`

Analisa produto por link, imagem ou produto já criado.

Body:

```json
{
  "product_id": "prod_123",
  "source_url": "https://loja.com/produto",
  "image_asset_id": "asset_123"
}
```

Resposta:

```json
{
  "product": {},
  "job": {}
}
```

## Upload e Mídia

`POST /uploads/product-image`

Upload de imagem inicial do produto via `multipart/form-data`.

Campos:

```text
file: File
product_id?: string
```

`GET /media-assets`

Lista mídias coletadas/geradas.

`POST /media/collect`

Inicia coleta de imagens/vídeos para um produto.

Body:

```json
{
  "product_id": "prod_123",
  "query": "Tênis Nike Air Max",
  "sources": ["web", "youtube", "marketplaces"]
}
```

## Vídeos

`POST /videos/generate`

Inicia geração assíncrona de vídeo.

Body:

```json
{
  "product_id": "prod_123",
  "media_asset_ids": ["asset_1", "asset_2"],
  "style": "product",
  "duration": "30s",
  "briefing": "Tom jovem e direto"
}
```

Resposta:

```json
{
  "job": {
    "id": "job_123",
    "type": "video_generation",
    "status": "queued",
    "progress": 0
  }
}
```

## Aprovação e Postagens

`POST /media/approve`

Aprova mídia e define plataformas.

Body:

```json
{
  "media_asset_id": "asset_123",
  "platforms": ["instagram", "tiktok"],
  "caption": "Legenda da postagem"
}
```

`POST /posts/schedule`

Agenda publicações.

Body:

```json
{
  "media_asset_id": "asset_123",
  "platforms": ["instagram"],
  "caption": "Legenda",
  "schedule_mode": "random_window",
  "scheduled_at": "2026-05-12T14:00:00.000Z"
}
```

`POST /posts/:id/publish-now`

Publica imediatamente.

## Plataformas

`GET /platforms/accounts`

Lista contas conectadas e status dos tokens.

`POST /platforms/:platform/connect`

Retorna URL OAuth para conectar plataforma.

`POST /platforms/:platform/disconnect`

Remove/desativa conexão.

## Comentários

`GET /comments`

Lista comentários monitorados.

`POST /comments/auto-reply`

Responde automaticamente um comentário com link do produto.

Body:

```json
{
  "comment_id": "comment_123",
  "product_id": "prod_123",
  "reply_template": "Aqui está o link: {{product_url}}"
}
```

## Comercial

`GET /commercial/summary`

Retorna visão comercial consolidada.

Resposta:

```json
{
  "products_count": 120,
  "low_stock_count": 8,
  "purchase_leads_count": 34,
  "average_margin": 42,
  "potential_revenue": 18400
}
```

`GET /commercial/leads`

Lista leads originados de comentários com intenção de compra.

`GET /suppliers`

Lista fornecedores simples vinculados aos produtos.

`POST /campaigns`

Cria campanha comercial conectada a produtos, estoque, metas e plataformas.

## Jobs Assíncronos

`GET /jobs`

Lista jobs recentes.

`GET /jobs/:id`

Consulta status de uma tarefa.

Estados esperados:

```text
queued
processing
completed
failed
cancelled
```

Tipos esperados:

```text
product_analysis
media_collection
video_generation
post_publishing
comment_reply
```

## Configurações

`GET /settings/automation`

Busca configurações atuais.

`PUT /settings/automation`

Atualiza configurações de automação.
