import { randomUUID } from "crypto";
import { marked } from "marked";
import { callOpenRouter } from "@/lib/openrouter";
import { articlesStore } from "@/lib/storage";
import type { Article, ArticleBrief, ArticleRaw, FaqItem } from "@/types";

const SYSTEM_PROMPT =
  "Eres redactor SEO experto en educación online, creación de cursos, ebooks y marketplaces como Lernymart. Contenido útil, humano, optimizado SEO, lenguaje claro, sin relleno, sin repetir keywords. Markdown con H2/H3, introducción atractiva, listas cuando sea útil, al menos una tabla markdown y al menos un blockquote (>). Usa negritas en frases clave del cuerpo (no solo en headings). El TEMA del brief es el eje del artículo: no te desvíes a otro enfoque. El markdown (articulo_md) cubre SOLO introducción y desarrollo por H2: NO incluyas sección de FAQs ni conclusión/CTA en el markdown (esas partes van en campos JSON aparte). Responde SOLO en formato JSON válido.";

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
      "Redacta el cuerpo del artículo (aprox. 900 a 1300 palabras) en markdown limpio.",
      "El contenido DEBE desarrollar el tema del brief de punta a punta.",
      "NO pongas H1 en articulo_md (el título se muestra aparte en la web).",
      "Empieza con una introducción breve y luego desarrolla cada H2 de estructura_h2.",
      "Incluye al menos UNA tabla markdown (comparativa, pasos/tiempos o pros/contras) cuando encaje.",
      "Incluye al menos UN blockquote con > (cita, dato clave o consejo destacado).",
      "Usa **negritas** en frases clave del párrafo (además de headings).",
      "PROHIBIDO en articulo_md: sección FAQs, Preguntas frecuentes, Conclusión, CTA final o cierre con llamado a la acción.",
      "Las FAQs van SOLO en el campo JSON faq (mínimo 3, máximo 6).",
      "El CTA va SOLO en el campo JSON cta (suave, orientado a aprender/crear/publicar cursos en Lernymart).",
      "No inventes estadísticas falsas ni promesas engañosas.",
      "Responde SOLO en formato JSON válido.",
    ],
    formato_respuesta: {
      articulo_md:
        "string — markdown del cuerpo (intro + H2/H3 + tabla + blockquote; SIN FAQs ni conclusión/CTA; SIN H1)",
      faq: [{ pregunta: "string", respuesta: "string" }],
      cta: "string — llamado a la acción final (solo este campo, no en el markdown)",
      score_seo_estimado: "number 0-100",
    },
  });

  let raw: ArticleRaw;
  try {
    raw = await callOpenRouter<ArticleRaw>(SYSTEM_PROMPT, userPrompt, {
      // gpt-4o-mini soporta hasta 16384 de salida; 16000 deja margen seguro.
      maxTokens: 16000,
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
    // runPipeline marca 'publicado' después de intentar la imagen de cabecera
    estado: "generado",
    fechaPublicacion: now,
    urlPublicacion: `/blog/${brief.slug}`,
    imagenUrl: undefined,
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
