
import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import { relatedKeywordsStore } from "@/lib/storage";
import type { ExpandedKeywordRaw, Intencion, RelatedKeyword, TipoKeyword } from "@/types";

const SYSTEM_PROMPT =
  "Eres un especialista en SEO programático y generación de keywords para automatización de contenido. Genera variaciones para blog, comparativas, búsquedas comerciales, locales, informativas, long-tail, nicho médico/laboratorios clínicos. Clasifica cada una según intencion y tipo_keyword. SOLO JSON válido, sin markdown, sin repetir keywords, prioriza intención comercial/comparativa.";

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
      'Formato: { "keywords": [ { "keyword": string, "intencion": "informacional"|"comercial"|"local"|"comparativa", "tipo_keyword": "precio"|"comparativa"|"local"|"informativa"|"confianza"|"resultados"|"tiempo"|"comercial" } ] }',
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

    const row: RelatedKeyword = {
      id: randomUUID(),
      keywordBase,
      categoria,
      keyword,
      intencion: normalizeIntencion(item.intencion),
      tipoKeyword: normalizeTipo(item.tipo_keyword),
    };

    await relatedKeywordsStore.insert(row);
    results.push(row);

    if (results.length >= 25) break;
  }

  if (results.length < 15) {
    console.warn(
      `expandKeywords: se esperaban 15–25 keywords, se obtuvieron ${results.length}`
    );
  }

  return results;
}
