
import { articleDecisionsStore } from "@/lib/storage";
import type {
  ArticleDecision,
  PrioridadEditorial,
  TipoContenido,
  TrendAnalysis,
} from "@/types";

export async function scoreAndApprove(
  analysis: TrendAnalysis
): Promise<ArticleDecision> {
  const {
    statusAnalisis,
    interesScore,
    prioridadSeo,
    intencionBusqueda,
    tipo,
    tendencia,
  } = analysis;

  let aprobado =
    statusAnalisis === "valido" &&
    interesScore >= 15 &&
    (prioridadSeo === "alta" || interesScore >= 30) &&
    (intencionBusqueda === "informacional" ||
      intencionBusqueda === "comercial" ||
      intencionBusqueda === "comparativa");

  if (interesScore >= 10 && (tipo === "precio" || tipo === "comercial")) {
    aprobado = true;
  }

  if (tendencia === "bajada" && interesScore < 25) {
    aprobado = false;
  }

  let tipoContenido: TipoContenido;
  if (!aprobado) {
    tipoContenido = "descartado";
  } else if (tipo === "precio" || tipo === "comercial") {
    tipoContenido = "landing_comercial";
  } else if (intencionBusqueda === "comparativa") {
    tipoContenido = "comparativa";
  } else {
    tipoContenido = "articulo_blog";
  }

  let prioridadEditorial: PrioridadEditorial = "baja";
  if (interesScore >= 50) prioridadEditorial = "alta";
  else if (interesScore >= 25) prioridadEditorial = "media";

  const motivos: string[] = [];
  if (statusAnalisis !== "valido") {
    motivos.push(`statusAnalisis=${statusAnalisis}`);
  }
  if (interesScore < 15 && !(tipo === "precio" || tipo === "comercial")) {
    motivos.push(`interesScore bajo (${interesScore})`);
  }
  if (tendencia === "bajada" && interesScore < 25) {
    motivos.push("penalización por tendencia bajada con interesScore < 25");
  }
  if (aprobado) {
    motivos.push(
      `aprobado como ${tipoContenido} (prioridad editorial ${prioridadEditorial})`
    );
  } else if (motivos.length === 0) {
    motivos.push("no cumple umbrales de aprobación");
  }

  const decision: ArticleDecision = {
    ...analysis,
    articuloAprobado: aprobado,
    tipoContenido,
    prioridadEditorial,
    motivoDecision: motivos.join("; "),
  };

  await articleDecisionsStore.insert(decision);
  return decision;
}
