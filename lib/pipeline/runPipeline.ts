
import { randomUUID } from "crypto";
import { keywordSeedsStore } from "@/lib/storage";
import { analyzeTrends } from "@/lib/pipeline/analyzeTrends";
import { expandKeywords } from "@/lib/pipeline/expandKeywords";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateBrief } from "@/lib/pipeline/generateBrief";
import { scoreAndApprove } from "@/lib/pipeline/scoreAndApprove";
import type { ArticleDecision, PipelineSummary } from "@/types";

export interface RunPipelineInput {
  keywordBase: string;
  categoria: string;
  maxKeywordsToAnalyze?: number;
  maxArticlesToPublish?: number;
}

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

  await keywordSeedsStore.insert({
    id: randomUUID(),
    keywordBase,
    categoria,
  });

  const related = await expandKeywords({ keywordBase, categoria });
  summary.relatedKeywordsCount = related.length;

  const toAnalyze =
    typeof maxKeywordsToAnalyze === "number"
      ? related.slice(0, maxKeywordsToAnalyze)
      : related;

  const decisions: ArticleDecision[] = [];

  for (const rk of toAnalyze) {
    try {
      const analysis = await analyzeTrends(rk);
      summary.trendsAnalyzed += 1;

      const decision = await scoreAndApprove(analysis);
      if (decision.articuloAprobado) {
        summary.approvedCount += 1;
        decisions.push(decision);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Trend/approve "${rk.keyword}": ${message}`);
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
      const brief = await generateBrief(decision);
      summary.briefsGenerated += 1;

      const { article: published } = await generateArticle(brief);
      summary.articlesPublished += 1;
      summary.publishedUrls.push(
        published.urlPublicacion ?? `/blog/${published.slug}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(
        `Generate/publish "${decision.keywordRelacionada}": ${message}`
      );
    }
  }

  return summary;
}
