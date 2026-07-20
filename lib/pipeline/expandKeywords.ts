/**
 * Etapa 1 del pipeline n8n: expandir keyword base en variaciones SEO.
 * Equivalente al nodo LLM que escribía en la hoja "Related Keywords".
 */

import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import type { ExpandedKeywordRaw, Intencion, RelatedKeyword, TipoKeyword } from "@/types";

const SYSTEM_PROMPT =
  "Eres un especialista en SEO programático y generación de keywords para automatización de contenido. Tu tarea es expandir una keyword base en múltiples variaciones SEO útiles para: artículos de blog, comparativas, búsquedas comerciales, búsquedas locales, intención informativa, SEO long-tail. Debes generar keywords: naturales, realistas, orientadas a búsquedas reales de usuarios, relacionadas al nicho médico/laboratorios clínicos. Clasifica cada keyword según: intencion, tipo_keyword. IMPORTANTE: NO expliques nada, NO uses markdown, SOLO devuelve JSON válido, no repitas keywords, prioriza búsquedas con intención comercial o comparativa.";

const VALID_INTENCIONES: readonly Intencion[] = [
  "informacional",
  "comercial",
  "local",
  "comparativa",
] as const;

const VALID_TIPOS: readonly TipoKeyword[] = [
  "precio",
  "comparativa",
  "local",
  "informativa",
  "confianza",
  "resultados",
  "tiempo",
  "comercial",
] as const;

function normalizeIntencion(value: unknown): Intencion {
  const v = String(value ?? "")
    .toLowerCase()
    .trim();
  if ((VALID_INTENCIONES as readonly string[]).includes(v)) {
    return v as Intencion;
  }
  return "informacional";
}

function normalizeTipo(value: unknown): TipoKeyword {
  const v = String(value ?? "")
    .toLowerCase()
    .trim();
  if ((VALID_TIPOS as readonly string[]).includes(v)) {
    return v as TipoKeyword;
  }
  return "informativa";
}

interface ExpandResponse {
  keywords?: ExpandedKeywordRaw[];
  related_keywords?: ExpandedKeywordRaw[];
}

/**
 * Expande una keyword base en 15–25 RelatedKeyword tipadas.
 */
export async function expandKeywords(input: {
  keywordBase: string;
  categoria: string;
}): Promise<RelatedKeyword[]> {
  const { keywordBase, categoria } = input;

  const userPrompt = JSON.stringify({
    keyword_base: keywordBase,
    categoria,
    instrucciones: [
      "Genera entre 15 y 25 keywords relacionadas.",
      "Formato de respuesta: { \"keywords\": [ { \"keyword\": string, \"intencion\": \"informacional\"|\"comercial\"|\"local\"|\"comparativa\", \"tipo_keyword\": \"precio\"|\"comparativa\"|\"local\"|\"informativa\"|\"confianza\"|\"resultados\"|\"tiempo\"|\"comercial\" } ] }",
      "Nicho: laboratorios clínicos / salud / Perú.",
      "Prioriza intención comercial o comparativa cuando sea realista.",
      "No repetir keywords.",
    ],
  });

  const raw = await callOpenRouter<ExpandResponse>(SYSTEM_PROMPT, userPrompt);
  const list = raw.keywords ?? raw.related_keywords ?? [];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      "expandKeywords: OpenRouter no devolvió un array de keywords válido"
    );
  }

  const seen = new Set<string>();
  const results: RelatedKeyword[] = [];

  for (const item of list) {
    const keyword = String(item.keyword ?? "").trim();
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id: randomUUID(),
      keywordBase,
      categoria,
      keyword,
      intencion: normalizeIntencion(item.intencion),
      tipoKeyword: normalizeTipo(item.tipo_keyword),
    });

    if (results.length >= 25) break;
  }

  if (results.length < 15) {
    // No abortamos: el modelo a veces devuelve menos; seguimos con lo disponible.
    console.warn(
      `expandKeywords: se esperaban 15–25 keywords, se obtuvieron ${results.length}`
    );
  }

  return results;
}
