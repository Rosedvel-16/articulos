import { randomUUID } from "crypto";
import { marked } from "marked";
import { callOpenRouter } from "@/lib/openrouter";
import { articlesStore } from "@/lib/storage";
import type { Article, ArticleBrief, ArticleRaw, FaqItem } from "@/types";

const SYSTEM_PROMPT =
  "Eres redactor SEO experto en educación online, creación de cursos, ebooks y marketplaces como Lernymart. Contenido útil, humano, optimizado SEO, lenguaje claro, sin relleno, sin repetir keywords. Markdown con H2/H3, introducción atractiva, conclusión con CTA suave hacia Lernymart cuando encaje, listas cuando sea útil. El TEMA del brief es el eje del artículo: no te desvíes a otro enfoque. Estructura: Introducción, Desarrollo por H2, FAQs, Conclusión.";

export async function generateArticle(brief: ArticleBrief): Promise<{
  article: Article;
  html: string;
}> {
  const userPrompt = JSON.stringify({
    brief: {
      tema: brief.tema,
      titulo_h1: brief.tituloH1,
      estructura_h2: brief.estructuraH2,
      keyword_principal: brief.keywordPrincipal,
      keywords_secundarias: brief.keywordsSecundarias,
      meta_title: brief.metaTitle,
      meta_description: brief.metaDescription,
      slug: brief.slug,
      disclaimer: brief.disclaimer,
      mercado: "Perú / Latam",
      marca: "Lernymart",
    },
    instrucciones: [
      "Redacta un artículo de 1200 a 1800 palabras en markdown limpio.",
      "El contenido DEBE desarrollar el tema del brief de punta a punta.",
      "Usa el titulo_h1 como H1 (#).",
      "Desarrolla cada H2 de estructura_h2.",
      "Incluye FAQs finales (mínimo 3, máximo 6).",
      "CTA final suave orientado a aprender, crear o publicar cursos en Lernymart.",
      "No inventes estadísticas falsas ni promesas engañosas.",
    ],
    formato_respuesta: {
      articulo_md: "string — markdown completo del artículo",
      faq: [{ pregunta: "string", respuesta: "string" }],
      cta: "string — llamado a la acción final",
      score_seo_estimado: "number 0-100",
    },
  });

  let raw: ArticleRaw;
  try {
    raw = await callOpenRouter<ArticleRaw>(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 8192,
    });
  } catch (err) {
    console.error("[generateArticle] OpenRouter failed", {
      slug: brief.slug,
      tema: brief.tema,
      keywordPrincipal: brief.keywordPrincipal,
      err:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              ...("status" in err
                ? { status: (err as { status?: number }).status }
                : {}),
              ...("body" in err
                ? {
                    body: String((err as { body?: string }).body).slice(0, 1000),
                  }
                : {}),
            }
          : err,
    });
    throw err;
  }

  const articuloMd = String(raw.articulo_md ?? "").trim();
  if (!articuloMd) {
    console.error("[generateArticle] missing articulo_md", raw);
    throw new Error("generateArticle: OpenRouter no devolvió articulo_md");
  }

  const html = await marked.parse(articuloMd, {
    async: true,
    gfm: true,
    breaks: false,
  });

  const faq: FaqItem[] = Array.isArray(raw.faq)
    ? raw.faq
        .filter(
          (item): item is FaqItem =>
            typeof item === "object" &&
            item !== null &&
            typeof item.pregunta === "string" &&
            typeof item.respuesta === "string"
        )
        .map((item) => ({
          pregunta: item.pregunta.trim(),
          respuesta: item.respuesta.trim(),
        }))
    : [];

  const cta = String(raw.cta ?? "").trim();
  const scoreSeoEstimado =
    typeof raw.score_seo_estimado === "number" &&
    Number.isFinite(raw.score_seo_estimado)
      ? Math.max(0, Math.min(100, Math.round(raw.score_seo_estimado)))
      : brief.scoreSeo;

  const now = new Date().toISOString();
  const article: Article = {
    id: brief.idArticulo || randomUUID(),
    keywordBase: brief.keywordBase,
    fechaGeneracion: brief.fechaGeneracion || now,
    tema: brief.tema,
    tituloH1: brief.tituloH1,
    estructuraH2: brief.estructuraH2,
    keywordPrincipal: brief.keywordPrincipal,
    keywordsSecundarias: brief.keywordsSecundarias,
    metaTitle: brief.metaTitle,
    metaDescription: brief.metaDescription,
    slug: brief.slug,
    scoreSeo: brief.scoreSeo,
    articuloMd,
    faq,
    cta,
    scoreSeoEstimado,
    estado: "publicado",
    fechaPublicacion: now,
    urlPublicacion: `/blog/${brief.slug}`,
    autor: brief.autor,
    disclaimer: brief.disclaimer,
  };

  try {
    const existing = await articlesStore.getBySlug(article.slug);
    if (existing) {
      const updated = await articlesStore.update(existing.id, {
        ...article,
        id: existing.id,
      });
      return { article: updated ?? { ...article, id: existing.id }, html };
    }

    const inserted = await articlesStore.insert(article);
    return { article: inserted, html };
  } catch (err) {
    console.error("[generateArticle] Supabase articles insert/update failed", {
      slug: article.slug,
      id: article.id,
      estado: article.estado,
      articuloMdLength: article.articuloMd.length,
      err: err instanceof Error ? err.message : err,
    });
    throw err;
  }
}
