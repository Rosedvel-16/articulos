/**
 * Orquestador del pipeline SEO — equivalente al workflow n8n completo.
 * Guarda resultados intermedios en cada "tabla" (antes hojas de Google Sheets).
 */

import { randomUUID } from "crypto";
import {
  articleBriefsStore,
  articleDecisionsStore,
  keywordSeedsStore,
  relatedKeywordsStore,
  trendAnalysesStore,
} from "@/lib/storage";
import { analyzeTrends } from "@/lib/pipeline/analyzeTrends";
import { expandKeywords } from "@/lib/pipeline/expandKeywords";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateBrief } from "@/lib/pipeline/generateBrief";
import { publishArticle } from "@/lib/pipeline/publishArticle";
import { scoreAndApprove } from "@/lib/pipeline/scoreAndApprove";
import type { PipelineSummary } from "@/types";

export interface RunPipelineInput {
  keywordBase: string;
  categoria: string;
  /**
   * Límite opcional de keywords a analizar (útil para pruebas / costos API).
   * Por defecto procesa todas las generadas (15–25).
   */
  maxKeywordsToAnalyze?: number;
  /**
   * Máximo de artículos a generar/publicar en una corrida.
   * Por defecto 1 para controlar costo de tokens en el prototipo.
   */
  maxArticlesToPublish?: number;
}

/**
 * Ejecuta el pipeline de extremo a extremo para una keywordBase.
 */
export async function runPipeline(
  input: RunPipelineInput
): Promise<PipelineSummary> {
  const {
    keywordBase,
    categoria,
    maxKeywordsToAnalyze,
    maxArticlesToPublish = 1,
  } = input;

  const summary: PipelineSummary = {
    keywordBase,
    categoria,
    relatedKeywordsCount: 0,
    trendsAnalyzed: 0,
    approvedCount: 0,
    briefsGenerated: 0,
    articlesPublished: 0,
    publishedUrls: [],
    errors: [],
  };

  // 0) Seed — equivalente a append en hoja Keyword Seeds
  await keywordSeedsStore.insert({
    id: randomUUID(),
    keywordBase,
    categoria,
  });

  // 1) Expandir keywords
  const related = await expandKeywords({ keywordBase, categoria });
  for (const rk of related) {
    await relatedKeywordsStore.insert(rk);
  }
  summary.relatedKeywordsCount = related.length;

  const toAnalyze =
    typeof maxKeywordsToAnalyze === "number"
      ? related.slice(0, maxKeywordsToAnalyze)
      : related;

  const decisions = [];

  // 2 + 3) Trends + aprobación por keyword
  for (const rk of toAnalyze) {
    try {
      const analysis = await analyzeTrends(rk);
      await trendAnalysesStore.insert(analysis);
      summary.trendsAnalyzed += 1;

      // n8n: score + approve
      const decision = scoreAndApprove(analysis);
      await articleDecisionsStore.insert(decision);
      if (decision.articuloAprobado) {
        summary.approvedCount += 1;
        decisions.push(decision);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Trend/approve "${rk.keyword}": ${message}`);
    }
  }

  // Orden editorial: alta → media → baja, luego por interesScore
  const priorityRank = { alta: 0, media: 1, baja: 2 } as const;
  decisions.sort((a, b) => {
    const p =
      priorityRank[a.prioridadEditorial] - priorityRank[b.prioridadEditorial];
    if (p !== 0) return p;
    return b.interesScore - a.interesScore;
  });

  const toPublish = decisions.slice(0, maxArticlesToPublish);

  // 4 + 5 + 6) Brief → Artículo → Publicar
  for (const decision of toPublish) {
    try {
      const brief = await generateBrief(decision);
      await articleBriefsStore.insert(brief);
      summary.briefsGenerated += 1;

      const article = await generateArticle(brief);
      const { article: published } = await publishArticle(article);

      summary.articlesPublished += 1;
      summary.publishedUrls.push(published.urlPublicacion);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(
        `Generate/publish "${decision.keywordRelacionada}": ${message}`
      );
    }
  }

  return summary;
}
