# Integração Frontend + Backend na Vercel

Este projeto frontend (`projeto_123`) consome o backend (`projeto_321`) pela variável:

```env
VITE_API_BASE_URL=https://auto-media-backend.vercel.app/api
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

## Produção na Vercel

1. Faça deploy do backend primeiro.
2. Copie a URL pública do backend.
3. No projeto frontend da Vercel, configure:

```env
VITE_API_BASE_URL=https://auto-media-backend.vercel.app/api
```

4. No projeto backend da Vercel, configure:

```env
CORS_ORIGIN=https://auto-media-sooty.vercel.app
```

Se quiser testar local e produção ao mesmo tempo, use:

```env
CORS_ORIGIN=https://auto-media-sooty.vercel.app,http://localhost:5173
```

## Observação

Enquanto o backend estiver usando armazenamento em memória, os dados não são persistentes em produção. A próxima etapa sólida é conectar PostgreSQL/Prisma.
