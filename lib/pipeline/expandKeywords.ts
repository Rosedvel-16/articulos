import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import { relatedKeywordsStore } from "@/lib/storage";
import type { ExpandedKeywordRaw, Intencion, RelatedKeyword, TipoKeyword } from "@/types";

const SYSTEM_PROMPT =
  "Eres un especialista en SEO programático. Generas SOLO keywords cortas y realistas (2 a 4 palabras) que la gente sí busca en Google. Nicho: educación online, cursos, ebooks, vender/comprar formación, Lernymart. Prioriza intención comercial o comparativa. SOLO JSON válido, sin markdown, sin repetir keywords. Evita frases largas tipo tutorial completo.";

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

function wordCount(keyword: string): number {
  return keyword.trim().split(/\s+/).filter(Boolean).length;
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
      "Genera entre 12 y 18 keywords relacionadas.",
      "IMPORTANTE: cada keyword debe tener entre 2 y 4 palabras máximo.",
      "Deben ser búsquedas reales (ej: crear ebook, vender cursos, curso online, precio ebook).",
      "NO generes frases largas ni títulos de artículo.",
      "Incluye variaciones comerciales: precio, mejor, cómo, curso, vender, comprar.",
      'Formato: { "keywords": [ { "keyword": string, "intencion": "informacional"|"comercial"|"local"|"comparativa", "tipo_keyword": "precio"|"comparativa"|"local"|"informativa"|"confianza"|"resultados"|"tiempo"|"comercial" } ] }',
    ],
    ejemplos_buenos: [
      "crear ebook",
      "vender cursos online",
      "curso ebook",
      "como hacer un ebook",
      "publicar ebook",
    ],
    ejemplos_malos: [
      "mejores plataformas para crear ebooks paso a paso",
      "cómo crear un ebook exitoso y venderlo en internet 2024",
    ],
  });

  const raw = await callOpenRouter<ExpandResponse>(SYSTEM_PROMPT, userPrompt);
  const list = raw.keywords ?? raw.related_keywords ?? [];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      "No se pudieron generar keywords relacionadas. Intenta de nuevo."
    );
  }

  const seen = new Set<string>();
  const results: RelatedKeyword[] = [];

  const baseRow: RelatedKeyword = {
    id: randomUUID(),
    keywordBase,
    categoria,
    keyword: keywordBase,
    intencion: "comercial",
    tipoKeyword: "comercial",
  };
  seen.add(keywordBase.toLowerCase());
  await relatedKeywordsStore.insert(baseRow);
  results.push(baseRow);

  const candidates: RelatedKeyword[] = [];

  for (const item of list) {
    const keyword = String(item.keyword ?? "").trim();
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;

    const words = wordCount(keyword);
    if (words < 1 || words > 5) continue;

    seen.add(key);
    candidates.push({
      id: randomUUID(),
      keywordBase,
      categoria,
      keyword,
      intencion: normalizeIntencion(item.intencion),
      tipoKeyword: normalizeTipo(item.tipo_keyword),
    });
  }

  candidates.sort((a, b) => wordCount(a.keyword) - wordCount(b.keyword));

  for (const row of candidates) {
    await relatedKeywordsStore.insert(row);
    results.push(row);
    if (results.length >= 18) break;
  }

  return results;
}
