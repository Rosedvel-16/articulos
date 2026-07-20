import Link from "next/link";
import { articlesStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

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
  const articles = await articlesStore.getPublished();
  articles.sort(
    (a, b) =>
      Date.parse(b.fechaPublicacion || b.fechaGeneracion) -
      Date.parse(a.fechaPublicacion || a.fechaGeneracion)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-12 border-b border-brand-200/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Blog de prueba
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Artículos publicados
        </h1>
        <p className="mt-3 text-ink-600">
          Salida del pipeline SEO. En producción estos posts irían al WordPress
          de lernymart.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 bg-white/50 px-6 py-10 text-center">
          <p className="text-ink-600">Aún no hay artículos publicados.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-2"
          >
            Generar el primero desde Admin
          </Link>
        </div>
      ) : (
        <ul className="space-y-8">
          {articles.map((article) => (
            <li key={article.idArticulo}>
              <article className="group border-l-2 border-brand-400 pl-5 transition hover:border-brand-600">
                <time
                  dateTime={article.fechaPublicacion}
                  className="text-xs font-medium uppercase tracking-wider text-ink-400"
                >
                  {formatDate(article.fechaPublicacion)}
                </time>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-950 group-hover:text-brand-800">
                  <Link href={`/blog/${article.slug}`}>{article.tituloH1}</Link>
                </h2>
                <p className="mt-2 text-ink-600 leading-relaxed">
                  {article.metaDescription}
                </p>
                <Link
                  href={`/blog/${article.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600"
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
