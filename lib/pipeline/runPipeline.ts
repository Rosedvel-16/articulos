import { randomUUID } from "crypto";
import { keywordSeedsStore } from "@/lib/storage";
import { analyzeTrends } from "@/lib/pipeline/analyzeTrends";
import { expandKeywords } from "@/lib/pipeline/expandKeywords";
import { attachArticleImage } from "@/lib/pipeline/attachArticleImage";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateBrief } from "@/lib/pipeline/generateBrief";
import {
  humanizePipelineError,
  motivoFromDecision,
} from "@/lib/pipeline/messages";
import { scoreAndApprove } from "@/lib/pipeline/scoreAndApprove";
import { articlesStore } from "@/lib/storage";
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

function wordCount(keyword: string): number {
  return keyword.trim().split(/\s+/).filter(Boolean).length;
}

function relevanceToTema(
  keyword: string,
  tema: string,
  keywordBase: string
): number {
  const k = keyword.toLowerCase();
  const base = keywordBase.toLowerCase();
  let score = 0;
  if (k === base) score += 100;
  for (const word of base.split(/\s+/)) {
    if (word.length > 2 && k.includes(word)) score += 15;
  }
  for (const word of tema.toLowerCase().split(/\s+/)) {
    if (word.length > 3 && k.includes(word)) score += 8;
  }
  return score;
}

export async function runPipeline(
  input: RunPipelineInput
): Promise<PipelineSummary> {
  const tema = input.tema.trim();
  const keywordBase = input.keywordBase.trim();
  const categoria = input.categoria.trim() || "cursos";
  const maxKeywordsToAnalyze = input.maxKeywordsToAnalyze ?? 5;
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

  const sortedForAnalysis = [...related].sort((a, b) => {
    if (a.keyword.toLowerCase() === keywordBase.toLowerCase()) return -1;
    if (b.keyword.toLowerCase() === keywordBase.toLowerCase()) return 1;
    const rel =
      relevanceToTema(b.keyword, tema, keywordBase) -
      relevanceToTema(a.keyword, tema, keywordBase);
    if (rel !== 0) return rel;
    return wordCount(a.keyword) - wordCount(b.keyword);
  });
  const toAnalyze = sortedForAnalysis.slice(0, maxKeywordsToAnalyze);
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
        if (decisions.length >= maxArticlesToPublish) {
          break;
        }
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
    const rel =
      relevanceToTema(b.keywordRelacionada, tema, keywordBase) -
      relevanceToTema(a.keywordRelacionada, tema, keywordBase);
    if (rel !== 0) return rel;
    const p =
      priorityRank[a.prioridadEditorial] - priorityRank[b.prioridadEditorial];
    if (p !== 0) return p;
    return b.interesScore - a.interesScore;
  });

  const toPublish = decisions.slice(0, maxArticlesToPublish);

  console.info("[runPipeline] post-approval", {
    approvedCount: decisions.length,
    toPublish: toPublish.map((d) => d.keywordRelacionada),
    openRouterKeyPresent: Boolean(process.env.OPENROUTER_API_KEY),
    pollinationsKeyPresent: Boolean(
      process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY
    ),
  });

  for (const decision of toPublish) {
    try {
      console.info("[runPipeline] generateBrief start", {
        keyword: decision.keywordRelacionada,
      });
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
      console.info("[runPipeline] generateBrief ok", {
        slug: brief.slug,
        idArticulo: brief.idArticulo,
      });

      console.info("[runPipeline] generateArticle start", {
        slug: brief.slug,
      });
      const { article: draft } = await generateArticle(brief);
      console.info("[runPipeline] generateArticle ok (borrador)", {
        id: draft.id,
        slug: draft.slug,
      });

      let imagenUrl = draft.imagenUrl;
      try {
        console.info("[runPipeline] attachArticleImage start", {
          slug: draft.slug,
        });
        const attached = await attachArticleImage(draft, categoria);
        imagenUrl = attached.imagenUrl;
        console.info("[runPipeline] attachArticleImage ok", {
          imagenUrl,
          source: attached.source,
        });
        if (attached.warning) {
          summary.errors.push(`Aviso imagen: ${attached.warning}`);
        }
      } catch (imgErr) {
        const imgMsg =
          imgErr instanceof Error ? imgErr.message : String(imgErr);
        console.error("[runPipeline] attachArticleImage failed (non-blocking)", {
          slug: draft.slug,
          message: imgMsg,
        });
        summary.errors.push(
          `Aviso: el artículo “${draft.slug}” se publicó sin imagen de cabecera (${imgMsg}).`
        );
      }

      const published =
        (await articlesStore.update(draft.id, {
          estado: "publicado",
          fechaPublicacion: new Date().toISOString(),
          ...(imagenUrl ? { imagenUrl } : {}),
        })) ?? { ...draft, estado: "publicado", imagenUrl };

      summary.articlesPublished += 1;
      summary.publishedUrls.push(
        published.urlPublicacion ?? `/blog/${published.slug}`
      );
      console.info("[runPipeline] article published", {
        id: published.id,
        slug: published.slug,
        url: published.urlPublicacion,
        hasImage: Boolean(published.imagenUrl ?? imagenUrl),
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const body =
        err && typeof err === "object" && "body" in err
          ? String((err as { body?: string }).body ?? "").slice(0, 800)
          : undefined;
      console.error("[runPipeline] post-approval failed", {
        keyword: decision.keywordRelacionada,
        message: raw,
        status,
        body,
      });
      const motivo = humanizePipelineError(raw);
      summary.errors.push(
        `No se pudo escribir el artículo con la keyword aprobada “${decision.keywordRelacionada}”: ${motivo}${
          status ? ` [HTTP ${status}]` : ""
        }`
      );
    }
  }

  return summary;
}
