import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCta } from "@/components/ArticleCta";
import { ArticleHero } from "@/components/ArticleHero";
import { FaqAccordion } from "@/components/FaqAccordion";
import {
  estimateReadingMinutes,
  prepareArticleBodyHtml,
} from "@/lib/articleHtml";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { markdownToHtml } from "@/lib/markdown";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

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

function resolveCategoryLabel(article: Article): string {
  const haystack = [
    article.keywordBase,
    article.keywordPrincipal,
    article.tema,
    article.slug,
  ]
    .join(" ")
    .toLowerCase();

  const match = ARTICLE_CATEGORIES.find(
    (c) =>
      haystack.includes(c.value.replace(/-/g, " ")) ||
      haystack.includes(c.value) ||
      haystack.includes(c.label.toLowerCase())
  );
  return match?.label ?? "General";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
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
  } catch {
    return { title: "Artículo no encontrado" };
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  let article: Article | null = null;
  try {
    article = await articlesStore.getBySlug(params.slug);
  } catch {
    notFound();
  }
  if (!article || article.estado !== "publicado") {
    notFound();
  }

  const rawHtml = await markdownToHtml(article.articuloMd);
  const html = prepareArticleBodyHtml(rawHtml);
  const categoryLabel = resolveCategoryLabel(article);
  const readingMinutes = estimateReadingMinutes(article.articuloMd);
  const categorySeed =
    article.keywordBase || article.keywordPrincipal || categoryLabel;

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-12 md:px-6 md:pt-16">
        <Link
          href="/blog"
          className="text-sm font-medium text-ink-950 underline decoration-brand-400 underline-offset-2 hover:decoration-brand-500"
        >
          ← Volver al blog
        </Link>
      </div>

      <ArticleHero title={article.tituloH1} categorySeed={categorySeed} />

      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <header className="mt-8 mb-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
            {article.tituloH1}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-ink-950 bg-ink-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-400">
              {categoryLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-ink-950 bg-brand-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-950">
              {readingMinutes} min de lectura
            </span>
            <span className="inline-flex items-center rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-800">
              <time dateTime={article.fechaPublicacion}>
                {formatDate(article.fechaPublicacion)}
              </time>
            </span>
          </div>
        </header>

        <article
          className="prose-article"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <FaqAccordion items={article.faq} />

        <ArticleCta text={article.cta} />

        {article.disclaimer && (
          <p className="mt-10 text-xs leading-relaxed text-ink-400">
            {article.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
