# lernymart — Pipeline SEO (prototipo)

Entorno de prueba en **Next.js 14 (App Router) + TypeScript** que replica el pipeline de generación de artículos SEO que hoy corre en **n8n + Google Sheets**, pensado para el sitio médico / laboratorios clínicos de **lernymart**.

Este proyecto genera artículos en 5 etapas (expandir keywords → tendencias → aprobación → brief → artículo) y los “publica” en el blog de este mismo sitio. El almacenamiento es un JSON local (`data/db.json`) como sustituto temporal de Google Sheets.

---

## Qué reemplaza cada módulo del flujo n8n

| Flujo n8n original | Módulo TypeScript | Rol |
|---|---|---|
| Google Sheets (hojas Keyword Seeds, Related Keywords, etc.) | `lib/storage.ts` + `data/db.json` | Persistencia append/update por etapa |
| Nodo LLM (expansión de keywords) | `lib/pipeline/expandKeywords.ts` + `lib/openrouter.ts` | 15–25 keywords relacionadas tipadas |
| Nodo SerpApi / Google Trends | `lib/serpapi.ts` + `lib/pipeline/analyzeTrends.ts` | Timeline + scoring exacto del n8n |
| Nodo de reglas de aprobación | `lib/pipeline/scoreAndApprove.ts` | Decide si se genera artículo y el tipo de contenido |
| Nodo LLM (brief SEO) | `lib/pipeline/generateBrief.ts` | Brief con H1, H2, meta, slug |
| Nodo LLM (redacción) | `lib/pipeline/generateArticle.ts` | Markdown 1200–1800 palabras + FAQ + CTA |
| Nodo WordPress “Create a post” | `lib/pipeline/publishArticle.ts` | Publica en `/blog/[slug]` (stub local) |
| Orquestación del workflow | `lib/pipeline/runPipeline.ts` | Corre todo de punta a punta |
| Trigger / webhook | `app/api/pipeline/run` + `app/admin` | UI + API para lanzar el pipeline |

---

## Requisitos

- Node.js 18+
- Cuentas / API keys:
  - [OpenRouter](https://openrouter.ai/) (`OPENROUTER_API_KEY`)
  - [SerpApi](https://serpapi.com/) (`SERPAPI_API_KEY`)

---

## Cómo correr el proyecto en local

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local y pega tus API keys

# 3) Arrancar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- **Admin:** [http://localhost:3000/admin](http://localhost:3000/admin) — formulario para lanzar el pipeline
- **Blog:** [http://localhost:3000/blog](http://localhost:3000/blog) — artículos publicados
- **API articles:** `GET /api/articles`
- **API pipeline:** `POST /api/pipeline/run` con body `{ "keywordBase": "...", "categoria": "..." }`

> **Nota de costos:** una corrida completa consulta Google Trends por cada keyword expandida (15–25 llamadas SerpApi) y luego genera 1 brief + 1 artículo vía OpenRouter. Puedes limitar con `maxKeywordsToAnalyze` / `maxArticlesToPublish` en el body del POST.

---

## Variables de entorno

Copia `.env.local.example` → `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
SERPAPI_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Uso |
|---|---|
| `OPENROUTER_API_KEY` | Chat Completions para expandir keywords, brief y artículo |
| `SERPAPI_API_KEY` | Google Trends (`engine=google_trends`, `geo=PE`, `date=today 12-m`) |
| `NEXT_PUBLIC_SITE_URL` | Referer / título opcional en headers de OpenRouter |

---

## Cómo desplegar a Vercel

1. Sube el repo a GitHub/GitLab.
2. En [Vercel](https://vercel.com) → **New Project** → importa el repositorio.
3. Framework preset: **Next.js**.
4. Añade las env vars (`OPENROUTER_API_KEY`, `SERPAPI_API_KEY`, `NEXT_PUBLIC_SITE_URL`).
5. Deploy.

> **Limitación importante:** `data/db.json` **no persiste** en el filesystem de Vercel entre invocaciones serverless. El prototipo sirve para desarrollo local y demo. Para producción real hay que migrar el storage (ver abajo).

En Vercel Hobby el timeout de serverless es limitado; el pipeline puede necesitar un plan con `maxDuration` más alto (ya configurado a 300s en la route).

---

## Estructura del proyecto

```
app/
  admin/page.tsx          # UI para lanzar el pipeline
  blog/page.tsx           # Listado de artículos
  blog/[slug]/page.tsx   # Artículo + generateMetadata SEO
  api/pipeline/run/       # POST → runPipeline
  api/articles/           # GET → articles publicados
lib/
  storage.ts              # Mini DB JSON (reemplazo temporal de Sheets)
  openrouter.ts
  serpapi.ts
  pipeline/               # Etapas a–g del flujo
data/db.json
types/index.ts
```

---

## Próximos pasos para producción

1. **Migrar `lib/storage.ts` a Vercel Postgres o Vercel KV**  
   El filesystem no persiste en serverless. Modelar las mismas tablas (`keywordSeeds`, `relatedKeywords`, `trendAnalyses`, `articleBriefs`, `articles`) en Postgres (recomendado) o KV.

2. **Reemplazar `publishArticle.ts` por WordPress de lernymart**  
   Llamar a `POST /wp-json/wp/v2/posts` (igual que el nodo “Create a post” de n8n) con autenticación Application Password / JWT, y guardar la URL real del post.

3. Colas / jobs (Inngest, Trigger.dev o Vercel Queues) para no bloquear el request HTTP en corridas largas.

4. Autenticación en `/admin` y rate limiting en `/api/pipeline/run`.

5. Revisión humana opcional entre `scoreAndApprove` y `generateArticle` (cola editorial).

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |
