import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Article } from "@/types";

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

function mapArticlePreview(row: Record<string, unknown>): Pick<
  Article,
  "id" | "slug" | "tituloH1" | "metaDescription" | "fechaPublicacion"
> {
  return {
    id: String(row.id ?? row.id_articulo ?? ""),
    slug: String(row.slug ?? ""),
    tituloH1: String(row.titulo_h1 ?? ""),
    metaDescription: String(row.meta_description ?? ""),
    fechaPublicacion: String(row.fecha_publicacion ?? ""),
  };
}

export default async function BlogIndexPage() {
  // Server Component: consulta directa a Supabase (sin fetch a /api/articles)
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, titulo_h1, meta_description, fecha_publicacion, estado")
    .eq("estado", "publicado")
    .order("fecha_publicacion", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`No se pudieron cargar los artículos: ${error.message}`);
  }

  const articles = ((data ?? []) as Record<string, unknown>[]).map(
    mapArticlePreview
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-12 border-b border-ink-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-950">
          <span className="rounded-sm bg-brand-400 px-1.5 py-0.5">Blog de prueba</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Artículos publicados
        </h1>
        <p className="mt-3 text-ink-600">
          Salida del pipeline SEO. Los artículos se publican aquí mismo en /blog.
        </p>
      </header>

      {articles.length === 0 ? (
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
            <li key={article.id}>
              <article className="group border-l-2 border-brand-400 pl-5 transition hover:border-ink-950">
                <time
                  dateTime={article.fechaPublicacion}
                  className="text-xs font-medium uppercase tracking-wider text-ink-400"
                >
                  {formatDate(article.fechaPublicacion)}
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
