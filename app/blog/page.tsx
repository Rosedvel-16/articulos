import Link from "next/link";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 8; // 4 columnas × 2 filas

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

interface PageProps {
  searchParams?: { page?: string | string[] };
}

export default async function BlogIndexPage({ searchParams }: PageProps) {
  let articles: Article[] = [];
  let loadError: string | null = null;

  try {
    articles = await articlesStore.getPublished();
    articles.sort((a, b) => {
      const tb = Date.parse(b.fechaPublicacion || b.fechaGeneracion || "") || 0;
      const ta = Date.parse(a.fechaPublicacion || a.fechaGeneracion || "") || 0;
      return tb - ta;
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const total = articles.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(parsePage(searchParams?.page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageArticles = articles.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10 border-b border-ink-200 pb-8 md:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-950">
          <span className="rounded-sm bg-brand-400 px-1.5 py-0.5">
            Blog de prueba
          </span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Artículos publicados
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Salida del pipeline SEO. Los artículos se publican aquí mismo en
          /blog.
          {total > 0 ? (
            <span className="ml-1 text-ink-500">({total} publicados)</span>
          ) : null}
        </p>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-ink-950 bg-brand-100 px-6 py-8 text-sm text-ink-900">
          <p className="font-semibold text-ink-950">
            No se pudo conectar a Supabase
          </p>
          <p className="mt-2 text-ink-700">{loadError}</p>
        </div>
      ) : total === 0 ? (
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
        <>
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {pageArticles.map((article) => (
              <li key={article.id || article.slug} className="min-w-0">
                <article className="group flex h-full flex-col border-t-2 border-brand-400 pt-4">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="block overflow-hidden border border-ink-200 bg-ink-950"
                  >
                    {article.imagenUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.imagenUrl}
                        alt=""
                        className="aspect-[16/10] h-auto w-full object-cover transition duration-300 group-hover:opacity-95"
                      />
                    ) : (
                      <div
                        className="flex aspect-[16/10] w-full items-end p-3"
                        style={{
                          backgroundImage:
                            "linear-gradient(135deg, #0a0a0a 40%, #262626 70%, #ffd600 140%)",
                        }}
                        aria-hidden
                      >
                        <span className="font-display text-xs font-semibold text-brand-400">
                          lernymart
                        </span>
                      </div>
                    )}
                  </Link>

                  <time
                    dateTime={article.fechaPublicacion}
                    className="mt-3 text-[11px] font-medium uppercase tracking-wider text-ink-400"
                  >
                    {formatDate(
                      article.fechaPublicacion || article.fechaGeneracion
                    )}
                  </time>

                  <h2 className="mt-1 font-display text-lg font-semibold leading-snug text-ink-950 group-hover:text-ink-800">
                    <Link href={`/blog/${article.slug}`} className="line-clamp-3">
                      {article.tituloH1}
                    </Link>
                  </h2>

                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-600">
                    {article.metaDescription}
                  </p>

                  <Link
                    href={`/blog/${article.slug}`}
                    className="mt-3 inline-block text-sm font-semibold text-ink-950 underline decoration-brand-400 underline-offset-2 hover:decoration-brand-500"
                  >
                    Leer →
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-200 pt-6"
              aria-label="Paginación del blog"
            >
              <p className="text-sm text-ink-500">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={
                      currentPage === 2 ? "/blog" : `/blog?page=${currentPage - 1}`
                    }
                    className="border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-950 hover:border-ink-950"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="border border-ink-100 px-3 py-1.5 text-sm text-ink-300">
                    ← Anterior
                  </span>
                )}

                <ol className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      const href = page === 1 ? "/blog" : `/blog?page=${page}`;
                      const active = page === currentPage;
                      return (
                        <li key={page}>
                          {active ? (
                            <span
                              aria-current="page"
                              className="inline-flex min-w-[2rem] items-center justify-center bg-ink-950 px-2 py-1.5 text-sm font-semibold text-brand-400"
                            >
                              {page}
                            </span>
                          ) : (
                            <Link
                              href={href}
                              className="inline-flex min-w-[2rem] items-center justify-center border border-ink-200 bg-white px-2 py-1.5 text-sm font-medium text-ink-800 hover:border-ink-950"
                            >
                              {page}
                            </Link>
                          )}
                        </li>
                      );
                    }
                  )}
                </ol>

                {currentPage < totalPages ? (
                  <Link
                    href={`/blog?page=${currentPage + 1}`}
                    className="border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-950 hover:border-ink-950"
                  >
                    Siguiente →
                  </Link>
                ) : (
                  <span className="border border-ink-100 px-3 py-1.5 text-sm text-ink-300">
                    Siguiente →
                  </span>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
