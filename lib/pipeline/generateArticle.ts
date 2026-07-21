import { randomUUID } from "crypto";
import { marked } from "marked";
import { callOpenRouter } from "@/lib/openrouter";
import { articlesStore } from "@/lib/storage";
import type { Article, ArticleBrief, FaqItem } from "@/types";

const SYSTEM_BODY =
  "Eres redactor SEO experto en educación online, cursos, ebooks y Lernymart. Escribes claro, útil, sin relleno. Markdown con H2/H3, una tabla y un blockquote (>). Negritas en frases clave. El TEMA del brief es el eje. NO incluyas FAQs ni conclusión/CTA ni H1 en el markdown. El artículo debe mencionar el concepto de 'infoproducto(s)' de forma natural en la introducción y en al menos 2 secciones del desarrollo, presentando el formato específico de la keyword_principal (curso, ebook, podcast, etc.) como un ejemplo o tipo de infoproducto. Mantén siempre la keyword_principal con densidad natural para SEO. Prioriza que el artículo suene coherente y fluido — no repitas 'infoproducto' de forma forzada ni antinatural. Responde SOLO en formato JSON válido.";

const SYSTEM_META =
  "Eres editor SEO. Generas FAQs cortas y un CTA suave para Lernymart. Responde SOLO en formato JSON válido.";

interface BodyRaw {
  articulo_md?: string;
}

interface MetaRaw {
  faq?: FaqItem[];
  cta?: string;
  score_seo_estimado?: number;
}

function logOpenRouterError(context: string, brief: ArticleBrief, err: unknown) {
  console.error(`[generateArticle] ${context}`, {
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
}

export async function generateArticle(brief: ArticleBrief): Promise<{
  article: Article;
  html: string;
}> {
  // Limitar H2 para no inflar tokens (máx. 5 secciones)
  const estructuraH2 = (brief.estructuraH2 ?? []).slice(0, 5);

  const bodyPrompt = JSON.stringify({
    brief: {
      tema: brief.tema,
      titulo_h1: brief.tituloH1,
      estructura_h2: estructuraH2,
      keyword_principal: brief.keywordPrincipal,
      keywords_secundarias: (brief.keywordsSecundarias ?? []).slice(0, 6),
      mercado: "Perú / Latam",
      marca: "Lernymart",
    },
    instrucciones: [
      "Redacta el cuerpo del artículo en markdown limpio: MÁXIMO 800 palabras (objetivo 650-800).",
      "Sé conciso: párrafos cortos, sin relleno ni repeticiones.",
      "NO pongas H1 (el título se muestra aparte en la web).",
      "Introducción breve + desarrolla SOLO los H2 de estructura_h2 (máx 5).",
      "Incluye exactamente UNA tabla markdown pequeña (3-5 filas).",
      "Incluye exactamente UN blockquote con >.",
      "Usa **negritas** en frases clave.",
      "PROHIBIDO: FAQs, Preguntas frecuentes, Conclusión, CTA.",
      "Responde SOLO JSON con la clave articulo_md.",
    ],
    formato_respuesta: {
      articulo_md:
        "string — markdown del cuerpo (intro + H2 + tabla + blockquote; SIN FAQs/CTA/H1; máx ~800 palabras)",
    },
  });

  let bodyRaw: BodyRaw;
  try {
    bodyRaw = await callOpenRouter<BodyRaw>(SYSTEM_BODY, bodyPrompt, {
      // gpt-4o-mini tope real ~16384; pedimos menos contenido para no llegar al corte
      maxTokens: 10000,
    });
  } catch (err) {
    logOpenRouterError("body OpenRouter failed", brief, err);
    throw err;
  }

  const articuloMd = String(bodyRaw.articulo_md ?? "").trim();
  if (!articuloMd) {
    console.error("[generateArticle] missing articulo_md", bodyRaw);
    throw new Error("generateArticle: OpenRouter no devolvió articulo_md");
  }

  const metaPrompt = JSON.stringify({
    tema: brief.tema,
    titulo_h1: brief.tituloH1,
    keyword_principal: brief.keywordPrincipal,
    resumen_cuerpo: articuloMd.slice(0, 1200),
    instrucciones: [
      "Genera entre 3 y 4 FAQs cortas (respuesta máx 2 frases cada una).",
      "Genera un CTA suave (1-2 frases) orientado a aprender/crear/publicar cursos en Lernymart.",
      "score_seo_estimado: number 0-100.",
      "Responde SOLO JSON válido.",
    ],
    formato_respuesta: {
      faq: [{ pregunta: "string", respuesta: "string" }],
      cta: "string",
      score_seo_estimado: "number 0-100",
    },
  });

  let metaRaw: MetaRaw = {};
  try {
    metaRaw = await callOpenRouter<MetaRaw>(SYSTEM_META, metaPrompt, {
      maxTokens: 2000,
    });
  } catch (err) {
    // FAQ/CTA no deben tumbar el artículo si el cuerpo ya salió bien
    logOpenRouterError("meta OpenRouter failed (non-fatal)", brief, err);
    metaRaw = {
      faq: [],
      cta: "Explora cursos y crea el tuyo en Lernymart cuando estés listo.",
      score_seo_estimado: brief.scoreSeo,
    };
  }

  const html = await marked.parse(articuloMd, {
    async: true,
    gfm: true,
    breaks: false,
  });

  const faq: FaqItem[] = Array.isArray(metaRaw.faq)
    ? metaRaw.faq
        .filter(
          (item): item is FaqItem =>
            typeof item === "object" &&
            item !== null &&
            typeof item.pregunta === "string" &&
            typeof item.respuesta === "string"
        )
        .slice(0, 4)
        .map((item) => ({
          pregunta: item.pregunta.trim(),
          respuesta: item.respuesta.trim(),
        }))
    : [];

  const cta = String(metaRaw.cta ?? "").trim();
  const scoreSeoEstimado =
    typeof metaRaw.score_seo_estimado === "number" &&
    Number.isFinite(metaRaw.score_seo_estimado)
      ? Math.max(0, Math.min(100, Math.round(metaRaw.score_seo_estimado)))
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
