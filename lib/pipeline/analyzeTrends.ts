/**
 * Etapa 2 del pipeline n8n: análisis de tendencias con Google Trends + scoring.
 * Replica EXACTAMENTE la lógica de scoring del workflow original.
 */

import { randomUUID } from "crypto";
import { getGoogleTrends, type TrendTimelinePoint } from "@/lib/serpapi";
import type {
  Estacionalidad,
  PrioridadSeo,
  RelatedKeyword,
  Tendencia,
  TrendAnalysis,
} from "@/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function extractMonthLabel(dateStr: string): string {
  // SerpApi suele devolver rangos tipo "Jan 5 – Jan 11, 2025" o timestamps.
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const shortEn: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  const lower = dateStr.toLowerCase();
  for (const [abbr, idx] of Object.entries(shortEn)) {
    if (lower.includes(abbr)) return months[idx];
  }

  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) {
    return months[new Date(parsed).getMonth()];
  }

  return dateStr || "desconocido";
}

/**
 * Scoring puro sobre un timeline — testeable sin red.
 * Lógica n8n (pseudocódigo → TypeScript estricto).
 */
export function scoreTimeline(timeline: TrendTimelinePoint[]): {
  averageScore: number;
  maxScore: number;
  peakMonths: string[];
  tendencia: Tendencia;
  scoreOportunidad: number;
  estacionalidad: Estacionalidad;
  prioridadSeo: PrioridadSeo;
  statusAnalisis: "bajo_volumen" | "valido";
} {
  const values = timeline.map((p) => p.value);
  const averageScore = average(values);
  const maxScore = values.length > 0 ? Math.max(...values) : 0;

  // peakMonths = meses donde valor >= maxScore * 0.8 y > 0
  const peakMonths = Array.from(
    new Set(
      timeline
        .filter((p) => p.value >= maxScore * 0.8 && p.value > 0)
        .map((p) => extractMonthLabel(p.date))
    )
  );

  // tendencia = subida si último > primero, bajada si menor, si no estable
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  let tendencia: Tendencia = "estable";
  if (last > first) tendencia = "subida";
  else if (last < first) tendencia = "bajada";

  // scoreOportunidad = round(averageScore * 0.4 + maxScore * 0.6)
  const scoreOportunidad = Math.round(averageScore * 0.4 + maxScore * 0.6);

  // estacionalidad
  let estacionalidad: Estacionalidad = "baja";
  if (maxScore >= 70) estacionalidad = "alta";
  else if (maxScore >= 30) estacionalidad = "media";

  // prioridadSeo
  let prioridadSeo: PrioridadSeo = "baja";
  if (scoreOportunidad >= 70) prioridadSeo = "alta";
  else if (scoreOportunidad >= 40) prioridadSeo = "media";

  // statusAnalisis
  const statusAnalisis: "bajo_volumen" | "valido" =
    averageScore <= 5 ? "bajo_volumen" : "valido";

  return {
    averageScore,
    maxScore,
    peakMonths,
    tendencia,
    scoreOportunidad,
    estacionalidad,
    prioridadSeo,
    statusAnalisis,
  };
}

/**
 * Analiza tendencias de Google Trends para una RelatedKeyword y devuelve TrendAnalysis.
 */
export async function analyzeTrends(
  related: RelatedKeyword
): Promise<TrendAnalysis> {
  const timeline = await getGoogleTrends(related.keyword);
  const scored = scoreTimeline(timeline);

  return {
    id: randomUUID(),
    keywordBase: related.keywordBase,
    categoria: related.categoria,
    keywordRelacionada: related.keyword,
    intencionBusqueda: related.intencion,
    tipo: related.tipoKeyword,
    interesScore: Math.round(scored.averageScore * 100) / 100,
    scoreMaximo: scored.maxScore,
    tendencia: scored.tendencia,
    estacionalidad: scored.estacionalidad,
    listaMesesPico: scored.peakMonths,
    scoreOportunidad: scored.scoreOportunidad,
    prioridadSeo: scored.prioridadSeo,
    statusAnalisis: scored.statusAnalisis,
    fechaConsulta: new Date().toISOString(),
  };
}
