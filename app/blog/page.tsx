import Link from "next/link";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function BlogIndexPage() {
  let articles: Article[] = [];
  let loadError: string | null = null;

  try {
    // Todos los publicados, sin filtro de categoría; orden fecha_publicacion DESC
    articles = await articlesStore.getPublished();
    articles.sort((a, b) => {
      const tb = Date.parse(b.fechaPublicacion || b.fechaGeneracion || "") || 0;
      const ta = Date.parse(a.fechaPublicacion || a.fechaGeneracion || "") || 0;
      return tb - ta;
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-12 border-b border-ink-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-950">
          <span className="rounded-sm bg-brand-400 px-1.5 py-0.5">
            Blog de prueba
          </span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Artículos publicados
        </h1>
        <p className="mt-3 text-ink-600">
          Salida del pipeline SEO. Los artículos se publican aquí mismo en
          /blog.
          {articles.length > 0 ? (
            <span className="ml-1 text-ink-500">
              ({articles.length} publicados)
            </span>
          ) : null}
        </p>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-ink-950 bg-brand-100 px-6 py-8 text-sm text-ink-900">
          <p className="font-semibold text-ink-950">
            No se pudo conectar a Supabase
          </p>
          <p className="mt-2 text-ink-700">{loadError}</p>
          <p className="mt-3 text-ink-600">
            Revisa que existan{" "}
            <code className="text-ink-950">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code className="text-ink-950">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
            <code className="text-ink-950">.env.local</code> (local) o en Vercel
            → Environment Variables, y reinicia el servidor.
          </p>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 bg-white/50 px-6 py-10 text-center">
          <p className="text-ink-600">Aún no hay artículos publicados.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-semibold text-ink-950 underline decoration-brand-400 underline-offset-2"
          >
            Generar el primero desde Admin
          </Link>
        </div>
      ) : (
        <ul className="space-y-8">
          {articles.map((article) => (
            <li key={article.id || article.slug}>
              <article className="group border-l-2 border-brand-400 pl-5 transition hover:border-ink-950">
                <time
                  dateTime={article.fechaPublicacion}
                  className="text-xs font-medium uppercase tracking-wider text-ink-400"
                >
                  {formatDate(
                    article.fechaPublicacion || article.fechaGeneracion
                  )}
                </time>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-950 group-hover:text-ink-800">
                  <Link href={`/blog/${article.slug}`}>{article.tituloH1}</Link>
                </h2>
                <p className="mt-2 text-ink-600 leading-relaxed">
                  {article.metaDescription}
                </p>
                <Link
                  href={`/blog/${article.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-ink-950 underline decoration-brand-400 underline-offset-2 hover:decoration-brand-500"
                >
                  Leer artículo →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
