/**
 * Etapa 3 del pipeline n8n: decidir si se aprueba el artículo.
 * Replica EXACTAMENTE las reglas de aprobación del workflow original.
 */

import type {
  ArticleDecision,
  PrioridadEditorial,
  TipoContenido,
  TrendAnalysis,
} from "@/types";

/**
 * Aplica reglas de aprobación sobre un TrendAnalysis y devuelve ArticleDecision.
 */
export function scoreAndApprove(analysis: TrendAnalysis): ArticleDecision {
  const {
    statusAnalisis,
    interesScore,
    prioridadSeo,
    intencionBusqueda,
    tipo,
    tendencia,
  } = analysis;

  // Regla base (n8n):
  // aprobado = true si statusAnalisis === 'valido'
  //   AND interesScore >= 15
  //   AND (prioridadSeo === 'alta' OR interesScore >= 30)
  //   AND intencionBusqueda en ['informacional','comercial','comparativa']
  let aprobado =
    statusAnalisis === "valido" &&
    interesScore >= 15 &&
    (prioridadSeo === "alta" || interesScore >= 30) &&
    (intencionBusqueda === "informacional" ||
      intencionBusqueda === "comercial" ||
      intencionBusqueda === "comparativa");

  // Boost comercial: si interesScore >= 10 AND tipo en ['precio','comercial'] → aprobado = true
  if (interesScore >= 10 && (tipo === "precio" || tipo === "comercial")) {
    aprobado = true;
  }

  // Penalización: si tendencia === 'bajada' AND interesScore < 25 → aprobado = false
  // (esto sobreescribe lo anterior)
  if (tendencia === "bajada" && interesScore < 25) {
    aprobado = false;
  }

  // tipoContenido
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

  // prioridadEditorial
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

  return {
    ...analysis,
    articuloAprobado: aprobado,
    tipoContenido,
    prioridadEditorial,
    motivoDecision: motivos.join("; "),
  };
}
