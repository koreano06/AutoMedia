# Integração Frontend Vercel + Backend VM

Este projeto frontend (`projeto_123`) consome o backend (`projeto_321`) pela variável:

```env
VITE_API_BASE_URL=https://api.seudominio.com/api
```

Frontend atual em produção:

```txt
https://auto-media-sooty.vercel.app
```

## Desenvolvimento local

Backend:

```bash
cd C:\Users\korea\Desktop\projeto_321\backend
npm run dev
```

Frontend:

```bash
cd C:\Users\korea\Desktop\projeto_123
npm run dev
```

`.env.local` do frontend:

```env
VITE_API_BASE_URL=http://localhost:3333/api
```

## Produção na Vercel com backend na VM

1. Publique o backend da VM por uma URL pública com HTTPS.
2. Copie a URL pública do backend, sempre terminando em `/api`.
3. No projeto frontend da Vercel, configure:

```env
VITE_API_BASE_URL=https://api.seudominio.com/api
```

4. No `.env.local` do backend na VM, configure:

```env
CORS_ORIGIN=https://auto-media-sooty.vercel.app
FRONTEND_URL=https://auto-media-sooty.vercel.app
API_PUBLIC_URL=https://api.seudominio.com
```

Se quiser testar local e produção ao mesmo tempo, use:

```env
CORS_ORIGIN=https://auto-media-sooty.vercel.app,http://localhost:5173
```

## Observação

Não use `http://192.168.1.42:3333/api` no frontend publicado na Vercel. Esse IP só funciona dentro da sua rede local.

Antes de publicar o frontend, rode:

```bash
npm run prod:check
```

Em `NODE_ENV=production` ou `VERCEL_ENV=production`, essa checagem bloqueia:

- API em `localhost`.
- API em IP privado como `192.168.x.x`.
- API pública sem HTTPS.

Isso evita o erro clássico em que o frontend da Vercel abre para você, mas não consegue falar com o backend da VM fora da sua rede.

Para desenvolvimento local com a VM:

```bash
npm run api:vm
```

Para produção com domínio/tunnel:

```bash
npm run api:public -- https://api.seudominio.com
```

