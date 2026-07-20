import { randomUUID } from "crypto";
import { keywordSeedsStore } from "@/lib/storage";
import { analyzeTrends } from "@/lib/pipeline/analyzeTrends";
import { expandKeywords } from "@/lib/pipeline/expandKeywords";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateBrief } from "@/lib/pipeline/generateBrief";
import {
  humanizePipelineError,
  motivoFromDecision,
} from "@/lib/pipeline/messages";
import { scoreAndApprove } from "@/lib/pipeline/scoreAndApprove";
import type {
  ArticleDecision,
  KeywordReviewItem,
  PipelineSummary,
} from "@/types";

export interface RunPipelineInput {
  tema: string;
  keywordBase: string;
  categoria: string;
  maxKeywordsToAnalyze?: number;
  maxArticlesToPublish?: number;
}

export async function runPipeline(
  input: RunPipelineInput
): Promise<PipelineSummary> {
  const tema = input.tema.trim();
  const keywordBase = input.keywordBase.trim();
  const categoria = input.categoria.trim() || "cursos";
  const maxKeywordsToAnalyze = input.maxKeywordsToAnalyze ?? 8;
  const maxArticlesToPublish = input.maxArticlesToPublish ?? 1;

  if (!tema) {
    throw new Error("El campo tema es requerido");
  }
  if (!keywordBase) {
    throw new Error("El campo palabra clave es requerido");
  }

  const summary: PipelineSummary = {
    tema,
    keywordBase,
    categoria,
    relatedKeywordsCount: 0,
    trendsAnalyzed: 0,
    approvedCount: 0,
    briefsGenerated: 0,
    articlesPublished: 0,
    publishedUrls: [],
    keywordReviews: [],
    errors: [],
  };

  await keywordSeedsStore.insert({
    id: randomUUID(),
    keywordBase,
    categoria,
  });

  const related = await expandKeywords({ keywordBase, categoria });
  summary.relatedKeywordsCount = related.length;

  const toAnalyze = related.slice(0, maxKeywordsToAnalyze);
  const decisions: ArticleDecision[] = [];

  for (const rk of toAnalyze) {
    try {
      const analysis = await analyzeTrends(rk);
      summary.trendsAnalyzed += 1;

      const decision = await scoreAndApprove(analysis);
      const review: KeywordReviewItem = {
        keyword: rk.keyword,
        status: decision.articuloAprobado ? "aprobada" : "descartada",
        motivo: motivoFromDecision(decision),
        interesScore: decision.interesScore,
        prioridadSeo: decision.prioridadSeo,
        tipoContenido: decision.tipoContenido,
      };
      summary.keywordReviews.push(review);

      if (decision.articuloAprobado) {
        summary.approvedCount += 1;
        decisions.push(decision);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const motivo = humanizePipelineError(raw);
      const isNoData =
        raw.toLowerCase().includes("hasn't returned") ||
        raw.toLowerCase().includes("no results");

      summary.keywordReviews.push({
        keyword: rk.keyword,
        status: isNoData ? "sin_datos" : "error",
        motivo,
      });
      summary.errors.push(`${rk.keyword}: ${motivo}`);
    }
  }

  const priorityRank = { alta: 0, media: 1, baja: 2 } as const;
  decisions.sort((a, b) => {
    const p =
      priorityRank[a.prioridadEditorial] - priorityRank[b.prioridadEditorial];
    if (p !== 0) return p;
    return b.interesScore - a.interesScore;
  });

  const toPublish = decisions.slice(0, maxArticlesToPublish);

  for (const decision of toPublish) {
    try {
      const brief = await generateBrief({
        tema,
        keywordBase,
        categoria,
        keywordRelacionada: decision.keywordRelacionada,
        intencionBusqueda: decision.intencionBusqueda,
        tipoContenido: decision.tipoContenido,
        scoreOportunidad: decision.scoreOportunidad,
        prioridadEditorial: decision.prioridadEditorial,
      });
      summary.briefsGenerated += 1;

      const { article: published } = await generateArticle(brief);
      summary.articlesPublished += 1;
      summary.publishedUrls.push(
        published.urlPublicacion ?? `/blog/${published.slug}`
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const motivo = humanizePipelineError(raw);
      summary.errors.push(
        `No se pudo generar el artículo para "${decision.keywordRelacionada}": ${motivo}`
      );
    }
  }

  return summary;
}
