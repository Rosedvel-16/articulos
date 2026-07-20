import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markdownToHtml } from "@/lib/markdown";
import { articlesStore } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const article = await articlesStore.getBySlug(params.slug);
  if (!article || article.estado !== "publicado") {
    return { title: "Artículo no encontrado" };
  }

  return {
    title: article.metaTitle || article.tituloH1,
    description: article.metaDescription,
    openGraph: {
      title: article.metaTitle || article.tituloH1,
      description: article.metaDescription,
      type: "article",
      publishedTime: article.fechaPublicacion,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const article = await articlesStore.getBySlug(params.slug);
  if (!article || article.estado !== "publicado") {
    notFound();
  }

  const html = await markdownToHtml(article.articuloMd);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <Link
        href="/blog"
        className="text-sm font-medium text-ink-950 underline decoration-brand-400 underline-offset-2 hover:decoration-brand-500"
      >
        ← Volver al blog
      </Link>

      <header className="mt-6 mb-10">
        <time
          dateTime={article.fechaPublicacion}
          className="text-xs font-medium uppercase tracking-wider text-ink-400"
        >
          {formatDate(article.fechaPublicacion)}
        </time>
        <p className="mt-3 text-sm text-ink-500">
          Keyword: <span className="font-medium text-ink-700">{article.keywordPrincipal}</span>
          {" · "}
          Score SEO estimado: {article.scoreSeoEstimado}
        </p>
      </header>

      <article
        className="prose-article"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {article.faq.length > 0 && (
        <section className="mt-14 border-t border-ink-200 pt-10">
          <h2 className="font-display text-2xl font-semibold text-ink-950">
            Preguntas frecuentes
          </h2>
          <dl className="mt-6 space-y-6">
            {article.faq.map((item) => (
              <div key={item.pregunta}>
                <dt className="font-semibold text-ink-900">{item.pregunta}</dt>
                <dd className="mt-1.5 text-ink-600 leading-relaxed">
                  {item.respuesta}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {article.cta && (
        <aside className="mt-12 rounded-xl border border-ink-950 bg-ink-950 px-6 py-8 text-center text-white">
          <p className="font-display text-xl font-semibold text-brand-400">
            Próximo paso
          </p>
          <p className="mx-auto mt-3 max-w-lg text-white/85 leading-relaxed">
            {article.cta}
          </p>
        </aside>
      )}

      {article.disclaimer && (
        <p className="mt-10 text-xs leading-relaxed text-ink-400">
          {article.disclaimer}
        </p>
      )}
    </div>
  );
}
