
import { getSupabase } from "@/lib/supabase";
import type {
  Article,
  ArticleBrief,
  ArticleDecision,
  FaqItem,
  KeywordSeed,
  RelatedKeyword,
  TrendAnalysis,
} from "@/types";

type TableName =
  | "keyword_seeds"
  | "related_keywords"
  | "trend_analyses"
  | "article_decisions"
  | "article_briefs"
  | "articles";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function asFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      pregunta: asString(item.pregunta),
      respuesta: asString(item.respuesta),
    }))
    .filter((item) => item.pregunta.length > 0);
}

function throwIfError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function keywordSeedFromRow(row: Record<string, unknown>): KeywordSeed {
  return {
    id: asString(row.id),
    keywordBase: asString(row.keyword_base),
    categoria: asString(row.categoria),
  };
}

function keywordSeedToRow(row: KeywordSeed): Record<string, unknown> {
  return {
    id: row.id,
    keyword_base: row.keywordBase,
    categoria: row.categoria,
  };
}

function relatedKeywordFromRow(row: Record<string, unknown>): RelatedKeyword {
  return {
    id: asString(row.id),
    keywordBase: asString(row.keyword_base),
    categoria: asString(row.categoria),
    keyword: asString(row.keyword),
    intencion: asString(row.intencion) as RelatedKeyword["intencion"],
    tipoKeyword: asString(row.tipo_keyword) as RelatedKeyword["tipoKeyword"],
  };
}

function relatedKeywordToRow(row: RelatedKeyword): Record<string, unknown> {
  return {
    id: row.id,
    keyword_base: row.keywordBase,
    categoria: row.categoria,
    keyword: row.keyword,
    intencion: row.intencion,
    tipo_keyword: row.tipoKeyword,
  };
}

function trendAnalysisFromRow(row: Record<string, unknown>): TrendAnalysis {
  return {
    id: asString(row.id),
    keywordBase: asString(row.keyword_base),
    categoria: asString(row.categoria),
    keywordRelacionada: asString(row.keyword_relacionada),
    intencionBusqueda: asString(
      row.intencion_busqueda
    ) as TrendAnalysis["intencionBusqueda"],
    tipo: asString(row.tipo) as TrendAnalysis["tipo"],
    interesScore: asNumber(row.interes_score),
    scoreMaximo: asNumber(row.score_maximo),
    tendencia: asString(row.tendencia) as TrendAnalysis["tendencia"],
    estacionalidad: asString(
      row.estacionalidad
    ) as TrendAnalysis["estacionalidad"],
    listaMesesPico: asStringArray(row.lista_meses_pico),
    scoreOportunidad: asNumber(row.score_oportunidad),
    prioridadSeo: asString(row.prioridad_seo) as TrendAnalysis["prioridadSeo"],
    statusAnalisis: asString(
      row.status_analisis
    ) as TrendAnalysis["statusAnalisis"],
    fechaConsulta: asString(row.fecha_consulta),
  };
}

function trendAnalysisToRow(row: TrendAnalysis): Record<string, unknown> {
  return {
    id: row.id,
    keyword_base: row.keywordBase,
    categoria: row.categoria,
    keyword_relacionada: row.keywordRelacionada,
    intencion_busqueda: row.intencionBusqueda,
    tipo: row.tipo,
    interes_score: row.interesScore,
    score_maximo: row.scoreMaximo,
    tendencia: row.tendencia,
    estacionalidad: row.estacionalidad,
    lista_meses_pico: row.listaMesesPico,
    score_oportunidad: row.scoreOportunidad,
    prioridad_seo: row.prioridadSeo,
    status_analisis: row.statusAnalisis,
    fecha_consulta: row.fechaConsulta,
  };
}

function articleDecisionFromRow(row: Record<string, unknown>): ArticleDecision {
  return {
    ...trendAnalysisFromRow(row),
    articuloAprobado: asBoolean(row.articulo_aprobado),
    tipoContenido: asString(
      row.tipo_contenido
    ) as ArticleDecision["tipoContenido"],
    prioridadEditorial: asString(
      row.prioridad_editorial
    ) as ArticleDecision["prioridadEditorial"],
    motivoDecision: asString(row.motivo_decision),
  };
}

function articleDecisionToRow(row: ArticleDecision): Record<string, unknown> {
  return {
    ...trendAnalysisToRow(row),
    articulo_aprobado: row.articuloAprobado,
    tipo_contenido: row.tipoContenido,
    prioridad_editorial: row.prioridadEditorial,
    motivo_decision: row.motivoDecision,
  };
}

function articleBriefFromRow(row: Record<string, unknown>): ArticleBrief {
  return {
    idArticulo: asString(row.id_articulo),
    keywordBase: asString(row.keyword_base),
    fechaGeneracion: asString(row.fecha_generacion),
    tema: asString(row.tema),
    tituloH1: asString(row.titulo_h1),
    estructuraH2: asStringArray(row.estructura_h2),
    keywordPrincipal: asString(row.keyword_principal),
    keywordsSecundarias: asStringArray(row.keywords_secundarias),
    metaTitle: asString(row.meta_title),
    metaDescription: asString(row.meta_description),
    slug: asString(row.slug),
    scoreSeo: asNumber(row.score_seo),
    estado: asString(row.estado),
    autor: asString(row.autor),
    disclaimer: asString(row.disclaimer),
  };
}

function articleBriefToRow(row: ArticleBrief): Record<string, unknown> {
  return {
    id_articulo: row.idArticulo,
    keyword_base: row.keywordBase,
    fecha_generacion: row.fechaGeneracion,
    tema: row.tema,
    titulo_h1: row.tituloH1,
    estructura_h2: row.estructuraH2,
    keyword_principal: row.keywordPrincipal,
    keywords_secundarias: row.keywordsSecundarias,
    meta_title: row.metaTitle,
    meta_description: row.metaDescription,
    slug: row.slug,
    score_seo: row.scoreSeo,
    estado: row.estado,
    autor: row.autor,
    disclaimer: row.disclaimer,
  };
}

function articleFromRow(row: Record<string, unknown>): Article {
  const id = asString(row.id) || asString(row.id_articulo);
  const slug = asString(row.slug);
  return {
    id,
    keywordBase: asString(row.keyword_base),
    fechaGeneracion: asString(row.fecha_generacion),
    tema: asString(row.tema),
    tituloH1: asString(row.titulo_h1),
    estructuraH2: asStringArray(row.estructura_h2),
    keywordPrincipal: asString(row.keyword_principal),
    keywordsSecundarias: asStringArray(row.keywords_secundarias),
    metaTitle: asString(row.meta_title),
    metaDescription: asString(row.meta_description),
    slug,
    scoreSeo: asNumber(row.score_seo),
    articuloMd: asString(row.articulo_md),
    faq: asFaq(row.faq),
    cta: asString(row.cta),
    scoreSeoEstimado: asNumber(row.score_seo_estimado),
    estado: asString(row.estado),
    fechaPublicacion: asString(row.fecha_publicacion),
    urlPublicacion:
      asString(row.url_publicacion) || (slug ? `/blog/${slug}` : ""),
    autor: asString(row.autor) || undefined,
    disclaimer: asString(row.disclaimer) || undefined,
  };
}

function articleToRow(row: Article): Record<string, unknown> {
  return {
    id: row.id,
    keyword_base: row.keywordBase,
    fecha_generacion: row.fechaGeneracion,
    tema: row.tema,
    titulo_h1: row.tituloH1,
    estructura_h2: row.estructuraH2,
    keyword_principal: row.keywordPrincipal,
    keywords_secundarias: row.keywordsSecundarias,
    meta_title: row.metaTitle,
    meta_description: row.metaDescription,
    slug: row.slug,
    score_seo: row.scoreSeo,
    articulo_md: row.articuloMd,
    faq: row.faq,
    cta: row.cta,
    score_seo_estimado: row.scoreSeoEstimado,
    estado: row.estado,
    fecha_publicacion: row.fechaPublicacion || null,
    url_publicacion: row.urlPublicacion ?? `/blog/${row.slug}`,
    autor: row.autor ?? "lernymart SEO Pipeline",
    disclaimer: row.disclaimer ?? "",
  };
}

function briefPatchToRow(
  patch: Partial<ArticleBrief>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.idArticulo !== undefined) out.id_articulo = patch.idArticulo;
  if (patch.keywordBase !== undefined) out.keyword_base = patch.keywordBase;
  if (patch.fechaGeneracion !== undefined)
    out.fecha_generacion = patch.fechaGeneracion;
  if (patch.tema !== undefined) out.tema = patch.tema;
  if (patch.tituloH1 !== undefined) out.titulo_h1 = patch.tituloH1;
  if (patch.estructuraH2 !== undefined) out.estructura_h2 = patch.estructuraH2;
  if (patch.keywordPrincipal !== undefined)
    out.keyword_principal = patch.keywordPrincipal;
  if (patch.keywordsSecundarias !== undefined)
    out.keywords_secundarias = patch.keywordsSecundarias;
  if (patch.metaTitle !== undefined) out.meta_title = patch.metaTitle;
  if (patch.metaDescription !== undefined)
    out.meta_description = patch.metaDescription;
  if (patch.slug !== undefined) out.slug = patch.slug;
  if (patch.scoreSeo !== undefined) out.score_seo = patch.scoreSeo;
  if (patch.estado !== undefined) out.estado = patch.estado;
  if (patch.autor !== undefined) out.autor = patch.autor;
  if (patch.disclaimer !== undefined) out.disclaimer = patch.disclaimer;
  return out;
}

function articlePatchToRow(patch: Partial<Article>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.id !== undefined) out.id = patch.id;
  if (patch.keywordBase !== undefined) out.keyword_base = patch.keywordBase;
  if (patch.fechaGeneracion !== undefined)
    out.fecha_generacion = patch.fechaGeneracion;
  if (patch.tema !== undefined) out.tema = patch.tema;
  if (patch.tituloH1 !== undefined) out.titulo_h1 = patch.tituloH1;
  if (patch.estructuraH2 !== undefined) out.estructura_h2 = patch.estructuraH2;
  if (patch.keywordPrincipal !== undefined)
    out.keyword_principal = patch.keywordPrincipal;
  if (patch.keywordsSecundarias !== undefined)
    out.keywords_secundarias = patch.keywordsSecundarias;
  if (patch.metaTitle !== undefined) out.meta_title = patch.metaTitle;
  if (patch.metaDescription !== undefined)
    out.meta_description = patch.metaDescription;
  if (patch.slug !== undefined) out.slug = patch.slug;
  if (patch.scoreSeo !== undefined) out.score_seo = patch.scoreSeo;
  if (patch.articuloMd !== undefined) out.articulo_md = patch.articuloMd;
  if (patch.faq !== undefined) out.faq = patch.faq;
  if (patch.cta !== undefined) out.cta = patch.cta;
  if (patch.scoreSeoEstimado !== undefined)
    out.score_seo_estimado = patch.scoreSeoEstimado;
  if (patch.estado !== undefined) out.estado = patch.estado;
  if (patch.fechaPublicacion !== undefined) {
    out.fecha_publicacion = patch.fechaPublicacion || null;
  }
  if (patch.urlPublicacion !== undefined)
    out.url_publicacion = patch.urlPublicacion;
  if (patch.autor !== undefined) out.autor = patch.autor;
  if (patch.disclaimer !== undefined) out.disclaimer = patch.disclaimer;
  return out;
}

function keywordSeedPatchToRow(
  patch: Partial<KeywordSeed>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.id !== undefined) out.id = patch.id;
  if (patch.keywordBase !== undefined) out.keyword_base = patch.keywordBase;
  if (patch.categoria !== undefined) out.categoria = patch.categoria;
  return out;
}

function relatedKeywordPatchToRow(
  patch: Partial<RelatedKeyword>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.id !== undefined) out.id = patch.id;
  if (patch.keywordBase !== undefined) out.keyword_base = patch.keywordBase;
  if (patch.categoria !== undefined) out.categoria = patch.categoria;
  if (patch.keyword !== undefined) out.keyword = patch.keyword;
  if (patch.intencion !== undefined) out.intencion = patch.intencion;
  if (patch.tipoKeyword !== undefined) out.tipo_keyword = patch.tipoKeyword;
  return out;
}

function trendAnalysisPatchToRow(
  patch: Partial<TrendAnalysis>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.id !== undefined) out.id = patch.id;
  if (patch.keywordBase !== undefined) out.keyword_base = patch.keywordBase;
  if (patch.categoria !== undefined) out.categoria = patch.categoria;
  if (patch.keywordRelacionada !== undefined)
    out.keyword_relacionada = patch.keywordRelacionada;
  if (patch.intencionBusqueda !== undefined)
    out.intencion_busqueda = patch.intencionBusqueda;
  if (patch.tipo !== undefined) out.tipo = patch.tipo;
  if (patch.interesScore !== undefined) out.interes_score = patch.interesScore;
  if (patch.scoreMaximo !== undefined) out.score_maximo = patch.scoreMaximo;
  if (patch.tendencia !== undefined) out.tendencia = patch.tendencia;
  if (patch.estacionalidad !== undefined)
    out.estacionalidad = patch.estacionalidad;
  if (patch.listaMesesPico !== undefined)
    out.lista_meses_pico = patch.listaMesesPico;
  if (patch.scoreOportunidad !== undefined)
    out.score_oportunidad = patch.scoreOportunidad;
  if (patch.prioridadSeo !== undefined) out.prioridad_seo = patch.prioridadSeo;
  if (patch.statusAnalisis !== undefined)
    out.status_analisis = patch.statusAnalisis;
  if (patch.fechaConsulta !== undefined)
    out.fecha_consulta = patch.fechaConsulta;
  return out;
}

function articleDecisionPatchToRow(
  patch: Partial<ArticleDecision>
): Record<string, unknown> {
  const out = trendAnalysisPatchToRow(patch);
  if (patch.articuloAprobado !== undefined)
    out.articulo_aprobado = patch.articuloAprobado;
  if (patch.tipoContenido !== undefined)
    out.tipo_contenido = patch.tipoContenido;
  if (patch.prioridadEditorial !== undefined)
    out.prioridad_editorial = patch.prioridadEditorial;
  if (patch.motivoDecision !== undefined)
    out.motivo_decision = patch.motivoDecision;
  return out;
}

async function getAllRows(
  table: TableName
): Promise<Record<string, unknown>[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).select("*");
  throwIfError(error, `getAll(${table})`);
  return (data ?? []) as Record<string, unknown>[];
}

async function getRowById(
  table: TableName,
  idColumn: "id" | "id_articulo",
  id: string
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(idColumn, id)
    .maybeSingle();
  throwIfError(error, `getById(${table})`);
  return (data as Record<string, unknown> | null) ?? null;
}

async function insertRow(
  table: TableName,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select("*")
    .single();
  throwIfError(error, `insert(${table})`);
  return data as Record<string, unknown>;
}

async function updateRow(
  table: TableName,
  idColumn: "id" | "id_articulo",
  id: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq(idColumn, id)
    .select("*")
    .maybeSingle();
  throwIfError(error, `update(${table})`);
  return (data as Record<string, unknown> | null) ?? null;
}

export const keywordSeedsStore = {
  getAll: async (): Promise<KeywordSeed[]> =>
    (await getAllRows("keyword_seeds")).map(keywordSeedFromRow),
  getById: async (id: string): Promise<KeywordSeed | null> => {
    const row = await getRowById("keyword_seeds", "id", id);
    return row ? keywordSeedFromRow(row) : null;
  },
  insert: async (row: KeywordSeed): Promise<KeywordSeed> =>
    keywordSeedFromRow(await insertRow("keyword_seeds", keywordSeedToRow(row))),
  update: async (
    id: string,
    patch: Partial<KeywordSeed>
  ): Promise<KeywordSeed | null> => {
    const row = await updateRow(
      "keyword_seeds",
      "id",
      id,
      keywordSeedPatchToRow(patch)
    );
    return row ? keywordSeedFromRow(row) : null;
  },
};

export const relatedKeywordsStore = {
  getAll: async (): Promise<RelatedKeyword[]> =>
    (await getAllRows("related_keywords")).map(relatedKeywordFromRow),
  getById: async (id: string): Promise<RelatedKeyword | null> => {
    const row = await getRowById("related_keywords", "id", id);
    return row ? relatedKeywordFromRow(row) : null;
  },
  insert: async (row: RelatedKeyword): Promise<RelatedKeyword> =>
    relatedKeywordFromRow(
      await insertRow("related_keywords", relatedKeywordToRow(row))
    ),
  update: async (
    id: string,
    patch: Partial<RelatedKeyword>
  ): Promise<RelatedKeyword | null> => {
    const row = await updateRow(
      "related_keywords",
      "id",
      id,
      relatedKeywordPatchToRow(patch)
    );
    return row ? relatedKeywordFromRow(row) : null;
  },
};

export const trendAnalysesStore = {
  getAll: async (): Promise<TrendAnalysis[]> =>
    (await getAllRows("trend_analyses")).map(trendAnalysisFromRow),
  getById: async (id: string): Promise<TrendAnalysis | null> => {
    const row = await getRowById("trend_analyses", "id", id);
    return row ? trendAnalysisFromRow(row) : null;
  },
  insert: async (row: TrendAnalysis): Promise<TrendAnalysis> =>
    trendAnalysisFromRow(
      await insertRow("trend_analyses", trendAnalysisToRow(row))
    ),
  update: async (
    id: string,
    patch: Partial<TrendAnalysis>
  ): Promise<TrendAnalysis | null> => {
    const row = await updateRow(
      "trend_analyses",
      "id",
      id,
      trendAnalysisPatchToRow(patch)
    );
    return row ? trendAnalysisFromRow(row) : null;
  },
};

export const articleDecisionsStore = {
  getAll: async (): Promise<ArticleDecision[]> =>
    (await getAllRows("article_decisions")).map(articleDecisionFromRow),
  getById: async (id: string): Promise<ArticleDecision | null> => {
    const row = await getRowById("article_decisions", "id", id);
    return row ? articleDecisionFromRow(row) : null;
  },
  insert: async (row: ArticleDecision): Promise<ArticleDecision> =>
    articleDecisionFromRow(
      await insertRow("article_decisions", articleDecisionToRow(row))
    ),
  update: async (
    id: string,
    patch: Partial<ArticleDecision>
  ): Promise<ArticleDecision | null> => {
    const row = await updateRow(
      "article_decisions",
      "id",
      id,
      articleDecisionPatchToRow(patch)
    );
    return row ? articleDecisionFromRow(row) : null;
  },
};

export const articleBriefsStore = {
  getAll: async (): Promise<ArticleBrief[]> =>
    (await getAllRows("article_briefs")).map(articleBriefFromRow),
  getById: async (id: string): Promise<ArticleBrief | null> => {
    const row = await getRowById("article_briefs", "id_articulo", id);
    return row ? articleBriefFromRow(row) : null;
  },
  insert: async (row: ArticleBrief): Promise<ArticleBrief> =>
    articleBriefFromRow(
      await insertRow("article_briefs", articleBriefToRow(row))
    ),
  update: async (
    id: string,
    patch: Partial<ArticleBrief>
  ): Promise<ArticleBrief | null> => {
    const row = await updateRow(
      "article_briefs",
      "id_articulo",
      id,
      briefPatchToRow(patch)
    );
    return row ? articleBriefFromRow(row) : null;
  },
};

export const articlesStore = {
  getAll: async (): Promise<Article[]> =>
    (await getAllRows("articles")).map(articleFromRow),
  getById: async (id: string): Promise<Article | null> => {
    const row = await getRowById("articles", "id", id);
    return row ? articleFromRow(row) : null;
  },
  insert: async (row: Article): Promise<Article> =>
    articleFromRow(await insertRow("articles", articleToRow(row))),
  update: async (
    id: string,
    patch: Partial<Article>
  ): Promise<Article | null> => {
    const row = await updateRow("articles", "id", id, articlePatchToRow(patch));
    return row ? articleFromRow(row) : null;
  },
    getBySlug: async (slug: string): Promise<Article | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    throwIfError(error, "articlesStore.getBySlug");
    return data ? articleFromRow(data as Record<string, unknown>) : null;
  },
  getPublished: async (): Promise<Article[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("estado", "publicado")
      .order("fecha_publicacion", { ascending: false, nullsFirst: false });
    throwIfError(error, "articlesStore.getPublished");
    return ((data ?? []) as Record<string, unknown>[]).map(articleFromRow);
  },
};
