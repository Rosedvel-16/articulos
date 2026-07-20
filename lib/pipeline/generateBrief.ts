/**
 * Etapa 4 del pipeline n8n: generar brief SEO (solo si articuloAprobado = true).
 * Equivalente al nodo LLM que escribía en la hoja "Article Briefs".
 */

import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import type { ArticleBrief, ArticleDecision, BriefRaw } from "@/types";

const SYSTEM_PROMPT =
  "Eres un estratega SEO senior especializado en: contenidos médicos, laboratorios clínicos, salud, keywords transaccionales e informativas. Tu trabajo es construir briefs SEO profesionales para blogs. Debes: analizar intención de búsqueda, generar estructura semántica SEO, evitar keyword stuffing, priorizar CTR, usar lenguaje natural, generar títulos optimizados para Google. Responde SOLO en JSON válido.";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Genera un ArticleBrief a partir de una ArticleDecision aprobada.
 */
export async function generateBrief(
  decision: ArticleDecision
): Promise<ArticleBrief> {
  if (!decision.articuloAprobado) {
    throw new Error(
      "generateBrief: solo se ejecuta para ArticleDecision con articuloAprobado=true"
    );
  }

  const userPrompt = JSON.stringify({
    keyword_base: decision.keywordBase,
    keyword_relacionada: decision.keywordRelacionada,
    categoria: decision.categoria,
    intencion_busqueda: decision.intencionBusqueda,
    tipo_keyword: decision.tipo,
    tipo_contenido: decision.tipoContenido,
    prioridad_editorial: decision.prioridadEditorial,
    score_oportunidad: decision.scoreOportunidad,
    mercado: "Perú",
    marca: "lernymart",
    formato_respuesta: {
      tema: "string",
      titulo_h1: "string — optimizado para CTR",
      estructura_h2: ["string"],
      keyword_principal: "string",
      keywords_secundarias: ["string"],
      meta_title: "string — máximo 60 caracteres",
      meta_description: "string — máximo 155 caracteres",
      slug: "string-url-amigable",
      score_seo: "number 0-100",
    },
    reglas: [
      "Contenido orientado a Perú",
      "Sonar profesional",
      "Evitar claims médicos peligrosos",
      "No inventar datos clínicos",
      "meta_title máx 60 caracteres",
      "meta_description máx 155 caracteres",
    ],
  });

  const raw = await callOpenRouter<BriefRaw>(SYSTEM_PROMPT, userPrompt);

  const tituloH1 = String(raw.titulo_h1 ?? "").trim();
  const slugRaw = String(raw.slug ?? tituloH1).trim();
  const slug = slugify(slugRaw) || slugify(decision.keywordRelacionada);

  let metaTitle = String(raw.meta_title ?? tituloH1).trim();
  if (metaTitle.length > 60) metaTitle = metaTitle.slice(0, 57) + "...";

  let metaDescription = String(raw.meta_description ?? "").trim();
  if (metaDescription.length > 155) {
    metaDescription = metaDescription.slice(0, 152) + "...";
  }

  const estructuraH2 = Array.isArray(raw.estructura_h2)
    ? raw.estructura_h2.map((h) => String(h))
    : [];

  const keywordsSecundarias = Array.isArray(raw.keywords_secundarias)
    ? raw.keywords_secundarias.map((k) => String(k))
    : [];

  const scoreSeo =
    typeof raw.score_seo === "number" && Number.isFinite(raw.score_seo)
      ? Math.max(0, Math.min(100, Math.round(raw.score_seo)))
      : decision.scoreOportunidad;

  return {
    idArticulo: randomUUID(),
    keywordBase: decision.keywordBase,
    fechaGeneracion: new Date().toISOString(),
    tema: String(raw.tema ?? decision.keywordRelacionada).trim(),
    tituloH1: tituloH1 || decision.keywordRelacionada,
    estructuraH2,
    keywordPrincipal:
      String(raw.keyword_principal ?? decision.keywordRelacionada).trim(),
    keywordsSecundarias,
    metaTitle,
    metaDescription,
    slug,
    scoreSeo,
    estado: "brief_generado",
    autor: "lernymart SEO Pipeline",
    disclaimer:
      "Este contenido es informativo y no sustituye la consulta con un profesional de la salud. Los resultados de laboratorio deben interpretarse con orientación médica.",
  };
}
