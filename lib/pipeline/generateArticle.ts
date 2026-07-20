/**
 * Etapa 5 del pipeline n8n: generar artículo final en markdown + FAQ + CTA.
 * Equivalente al nodo LLM de redacción del workflow original.
 */

import { callOpenRouter } from "@/lib/openrouter";
import type { Article, ArticleBrief, ArticleRaw, FaqItem } from "@/types";

const SYSTEM_PROMPT =
  "Eres un redactor SEO experto en salud y laboratorios clínicos. OBJETIVOS: redactar contenido útil y humano, optimizado para SEO, lenguaje claro y profesional, orientado a posicionamiento orgánico, evitar relleno, no repetir keywords excesivamente. REGLAS: usar markdown, usar títulos H2 y H3, introducción atractiva, conclusión con CTA suave, incluir listas cuando sea útil, NO inventar datos médicos, NO hacer diagnósticos. ESTRUCTURA: Introducción, Desarrollo por H2, FAQs finales, Conclusión.";

/**
 * Genera el Article completo a partir de un ArticleBrief.
 */
export async function generateArticle(brief: ArticleBrief): Promise<Article> {
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
      mercado: "Perú",
      marca: "lernymart",
    },
    instrucciones: [
      "Redacta un artículo de 1200 a 1800 palabras en markdown limpio.",
      "Usa el titulo_h1 como H1 (#).",
      "Desarrolla cada H2 de estructura_h2.",
      "Incluye FAQs finales (mínimo 3, máximo 6).",
      "Incluye un CTA final suave orientado a laboratorios clínicos / lernymart.",
      "No inventes datos médicos ni hagas diagnósticos.",
    ],
    formato_respuesta: {
      articulo_md: "string — markdown completo del artículo",
      faq: [{ pregunta: "string", respuesta: "string" }],
      cta: "string — llamado a la acción final",
      score_seo_estimado: "number 0-100",
    },
  });

  const raw = await callOpenRouter<ArticleRaw>(SYSTEM_PROMPT, userPrompt);

  const articuloMd = String(raw.articulo_md ?? "").trim();
  if (!articuloMd) {
    throw new Error("generateArticle: OpenRouter no devolvió articulo_md");
  }

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

  return {
    ...brief,
    articuloMd,
    faq,
    cta,
    scoreSeoEstimado,
    estado: "generado",
    fechaPublicacion: "",
    urlPublicacion: "",
  };
}
