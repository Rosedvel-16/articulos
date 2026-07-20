import { randomUUID } from "crypto";
import { keywordSeedsStore } from "@/lib/storage";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateBrief } from "@/lib/pipeline/generateBrief";
import type { PipelineSummary } from "@/types";

export interface RunPipelineInput {
  tema: string;
  keywordBase?: string;
  categoria: string;
}

function deriveKeywordFromTema(tema: string): string {
  const cleaned = tema
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  return words.slice(0, 6).join(" ") || cleaned;
}

export async function runPipeline(
  input: RunPipelineInput
): Promise<PipelineSummary> {
  const tema = input.tema.trim();
  const categoria = input.categoria.trim() || "cursos";
  const keywordBase =
    (input.keywordBase ?? "").trim() || deriveKeywordFromTema(tema);

  const summary: PipelineSummary = {
    keywordBase,
    categoria,
    relatedKeywordsCount: 0,
    trendsAnalyzed: 0,
    approvedCount: 1,
    briefsGenerated: 0,
    articlesPublished: 0,
    publishedUrls: [],
    errors: [],
  };

  if (!tema) {
    throw new Error("El campo tema es requerido");
  }

  await keywordSeedsStore.insert({
    id: randomUUID(),
    keywordBase,
    categoria,
  });

  try {
    const brief = await generateBrief({
      tema,
      keywordBase,
      categoria,
    });
    summary.briefsGenerated = 1;

    const { article: published } = await generateArticle(brief);
    summary.articlesPublished = 1;
    summary.publishedUrls.push(
      published.urlPublicacion ?? `/blog/${published.slug}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    summary.errors.push(`Generate/publish: ${message}`);
    summary.approvedCount = 0;
  }

  return summary;
}
