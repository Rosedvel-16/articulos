# lernymart — Pipeline SEO

Next.js 14 + TypeScript + Tailwind + Supabase. Genera artículos SEO y los publica en `/blog`.

## Variables de entorno

Copia `.env.local.example` → `.env.local` (iguales en Vercel):

```env
OPENROUTER_API_KEY=
SERPAPI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Local

```bash
npm install
npm run dev
```

- Admin: `/admin`
- Blog: `/blog`
- API: `POST /api/pipeline/run`, `GET /api/articles`
