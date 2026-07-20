export function humanizePipelineError(raw: string): string {
  const msg = raw.toLowerCase();

  if (
    msg.includes("hasn't returned any results") ||
    msg.includes("has not returned any results") ||
    msg.includes("no results")
  ) {
    return "No hay datos de búsqueda para esta keyword. Prueba una más corta (2–4 palabras), por ejemplo: crear ebook, vender cursos, curso online.";
  }
  if (msg.includes("serpapi") && msg.includes("api_key")) {
    return "Hay un problema con la clave de SerpApi. Revisa SERPAPI_API_KEY en Vercel.";
  }
  if (msg.includes("serpapi") || msg.includes("google trends")) {
    return "No se pudo consultar Google Trends para esta keyword. Intenta más tarde o usa otra keyword.";
  }
  if (msg.includes("openrouter") || msg.includes("api key")) {
    return "No se pudo generar el contenido con la IA. Revisa OPENROUTER_API_KEY en Vercel.";
  }
  if (msg.includes("supabase") || msg.includes("invalid path")) {
    return "No se pudo guardar en la base de datos. Revisa las variables de Supabase en Vercel.";
  }
  if (msg.includes("bajo_volumen") || msg.includes("bajo volumen")) {
    return "La keyword tiene muy poco volumen de búsqueda.";
  }

  return raw
    .replace(/^Trend\/approve\s*"[^"]*":\s*/i, "")
    .replace(/^Generate\/publish[^:]*:\s*/i, "")
    .trim();
}

export function motivoFromDecision(input: {
  articuloAprobado: boolean;
  motivoDecision: string;
  statusAnalisis: string;
  interesScore: number;
  tendencia: string;
}): string {
  if (input.articuloAprobado) {
    return "Pasó la evaluación SEO (volumen, intención y oportunidad).";
  }
  if (input.statusAnalisis === "bajo_volumen") {
    return "Descartada: volumen de búsqueda demasiado bajo.";
  }
  if (input.tendencia === "bajada" && input.interesScore < 25) {
    return "Descartada: la tendencia va a la baja y el interés es insuficiente.";
  }
  if (input.interesScore < 15) {
    return "Descartada: el interés promedio no alcanza el mínimo SEO.";
  }
  return "Descartada: no cumple las reglas de aprobación SEO.";
}
