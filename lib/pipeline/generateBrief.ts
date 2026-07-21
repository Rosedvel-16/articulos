import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import { articleBriefsStore } from "@/lib/storage";
import type {
  ArticleBrief,
  BriefRaw,
  Intencion,
  PrioridadEditorial,
  TipoContenido,
} from "@/types";

const SYSTEM_PROMPT =
  "Eres un estratega SEO senior especializado en educación online, marketplaces de cursos, creación de contenido digital y marcas como Lernymart. Construye briefs SEO profesionales: el TEMA del usuario es el eje del artículo (no inventes otro enfoque), la keyword aprobada guía el SEO, analiza intención, estructura semántica, evita keyword stuffing, prioriza CTR, títulos naturales optimizados para Google. SOLO JSON.";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface GenerateBriefInput {
  tema: string;
  keywordBase: string;
  categoria: string;
  keywordRelacionada: string;
  intencionBusqueda: Intencion;
  tipoContenido: TipoContenido;
  scoreOportunidad: number;
  prioridadEditorial: PrioridadEditorial;
}

export async function generateBrief(
  input: GenerateBriefInput
): Promise<ArticleBrief> {
  const tema = input.tema.trim();
  const keywordBase = input.keywordBase.trim();
  const categoria = input.categoria.trim() || "cursos";

  const userPrompt = JSON.stringify({
    tema_central: tema,
    keyword_base: keywordBase,
    keyword_aprobada_seo: input.keywordRelacionada,
    categoria,
    intencion_busqueda: input.intencionBusqueda,
    tipo_contenido: input.tipoContenido,
    prioridad_editorial: input.prioridadEditorial,
    score_oportunidad: input.scoreOportunidad,
    mercado: "Perú / Latam",
    marca: "Lernymart",
    contexto_negocio:
      "Lernymart es una plataforma donde las personas pueden comprar y vender cursos. El blog debe aportar valor educativo y, cuando encaje naturalmente, mencionar cómo Lernymart ayuda a crear, subir o comercializar contenido/cursos.",
    formato_respuesta: {
      tema: "string — debe reflejar el tema_central del usuario",
      titulo_h1: "string — atractivo para CTR; NO tiene que ser igual al tema",
      estructura_h2: ["string"],
      keyword_principal: "string — preferir keyword_aprobada_seo",
      keywords_secundarias: ["string"],
      meta_title: "string — máximo 60 caracteres",
      meta_description: "string — máximo 155 caracteres",
      slug: "string-url-amigable",
      score_seo: "number 0-100",
    },
    reglas: [
      "El artículo DEBE girar alrededor del tema_central",
      "La keyword_aprobada_seo debe usarse para SEO sin forzar el título",
      "Tono profesional, claro y útil",
      "Mencionar Lernymart de forma natural, sin spam",
      "meta_title máx 60 caracteres",
      "meta_description máx 155 caracteres",
    ],
  });

  let raw: BriefRaw;
  try {
    raw = await callOpenRouter<BriefRaw>(SYSTEM_PROMPT, userPrompt, {
      maxTokens: 2048,
    });
  } catch (err) {
    console.error("[generateBrief] OpenRouter failed", {
      keywordRelacionada: input.keywordRelacionada,
      tema,
      err:
        err instanceof Error
          ? { name: err.name, message: err.message, ...("status" in err ? { status: (err as { status?: number }).status } : {}), ...("body" in err ? { body: String((err as { body?: string }).body).slice(0, 1000) } : {}) }
          : err,
    });
    throw err;
  }

  const tituloH1 = String(raw.titulo_h1 ?? "").trim();
  const slugRaw = String(
    raw.slug ?? (tituloH1 || tema || input.keywordRelacionada)
  ).trim();
  const slug = slugify(slugRaw) || slugify(tema);

  let metaTitle = String(raw.meta_title ?? tituloH1).trim();
  if (metaTitle.length > 60) metaTitle = metaTitle.slice(0, 57) + "...";

  let metaDescription = String(raw.meta_description ?? "").trim();
  if (metaDescription.length > 155) {
    metaDescription = metaDescription.slice(0, 152) + "...";
  }

  const estructuraH2 = Array.isArray(raw.estructura_h2)
    ? raw.estructura_h2.map((h) => String(h))
    : [];

  const keywordsSecundarias = Array.isArray(raw.keywords_secundarias)
    ? raw.keywords_secundarias.map((k) => String(k))
    : [];

  const scoreSeo =
    typeof raw.score_seo === "number" && Number.isFinite(raw.score_seo)
      ? Math.max(0, Math.min(100, Math.round(raw.score_seo)))
      : input.scoreOportunidad;

  const brief: ArticleBrief = {
    idArticulo: randomUUID(),
    keywordBase,
    fechaGeneracion: new Date().toISOString(),
    tema: String(raw.tema ?? tema).trim() || tema,
    tituloH1: tituloH1 || tema,
    estructuraH2,
    keywordPrincipal: String(
      raw.keyword_principal ?? input.keywordRelacionada
    ).trim(),
    keywordsSecundarias,
    metaTitle,
    metaDescription,
    slug,
    scoreSeo,
    estado: "brief_generado",
    autor: "Lernymart",
    disclaimer:
      "Contenido informativo de Lernymart. Las decisiones de compra o venta de cursos son responsabilidad del usuario.",
  };

  try {
    await articleBriefsStore.insert(brief);
  } catch (err) {
    console.error("[generateBrief] Supabase insert article_briefs failed", {
      slug: brief.slug,
      idArticulo: brief.idArticulo,
      err: err instanceof Error ? err.message : err,
    });
    throw err;
  }
  return brief;
}
