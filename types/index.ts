
export type Intencion =
  | "informacional"
  | "comercial"
  | "local"
  | "comparativa";

export type TipoKeyword =
  | "precio"
  | "comparativa"
  | "local"
  | "informativa"
  | "confianza"
  | "resultados"
  | "tiempo"
  | "comercial";

export type Tendencia = "subida" | "bajada" | "estable";
export type Estacionalidad = "alta" | "media" | "baja";
export type PrioridadSeo = "alta" | "media" | "baja";
export type PrioridadEditorial = "alta" | "media" | "baja";

export type TipoContenido =
  | "landing_comercial"
  | "comparativa"
  | "articulo_blog"
  | "descartado";

export interface KeywordSeed {
  id: string;
  keywordBase: string;
  categoria: string;
}

export interface RelatedKeyword {
  id: string;
  keywordBase: string;
  categoria: string;
  keyword: string;
  intencion: Intencion;
  tipoKeyword: TipoKeyword;
}

export interface TrendAnalysis {
  id: string;
  keywordBase: string;
  categoria: string;
  keywordRelacionada: string;
  intencionBusqueda: Intencion;
  tipo: TipoKeyword;
  interesScore: number;
  scoreMaximo: number;
  tendencia: Tendencia;
  estacionalidad: Estacionalidad;
  listaMesesPico: string[];
  scoreOportunidad: number;
  prioridadSeo: PrioridadSeo;
  statusAnalisis: "bajo_volumen" | "valido";
  fechaConsulta: string;
}

export interface ArticleDecision extends TrendAnalysis {
  articuloAprobado: boolean;
  tipoContenido: TipoContenido;
  prioridadEditorial: PrioridadEditorial;
  motivoDecision: string;
}

export interface FaqItem {
  pregunta: string;
  respuesta: string;
}

export interface ArticleBrief {
  idArticulo: string;
  keywordBase: string;
  fechaGeneracion: string;
  tema: string;
  tituloH1: string;
  estructuraH2: string[];
  keywordPrincipal: string;
  keywordsSecundarias: string[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
  scoreSeo: number;
  estado: string;
  autor: string;
  disclaimer: string;
}

export interface Article {
  id: string;
  keywordBase: string;
  fechaGeneracion: string;
  tema: string;
  tituloH1: string;
  estructuraH2: string[];
  keywordPrincipal: string;
  keywordsSecundarias: string[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
  scoreSeo: number;
  articuloMd: string;
  faq: FaqItem[];
  cta: string;
  scoreSeoEstimado: number;
  estado: string;
  fechaPublicacion: string;
  urlPublicacion?: string;
  autor?: string;
  disclaimer?: string;
}

export interface ExpandedKeywordRaw {
  keyword: string;
  intencion: Intencion;
  tipo_keyword: TipoKeyword;
}

export interface BriefRaw {
  tema: string;
  titulo_h1: string;
  estructura_h2: string[];
  keyword_principal: string;
  keywords_secundarias: string[];
  meta_title: string;
  meta_description: string;
  slug: string;
  score_seo: number;
}

export interface ArticleRaw {
  articulo_md: string;
  faq: FaqItem[];
  cta: string;
  score_seo_estimado: number;
}

export interface PipelineSummary {
  keywordBase: string;
  categoria: string;
  relatedKeywordsCount: number;
  trendsAnalyzed: number;
  approvedCount: number;
  briefsGenerated: number;
  articlesPublished: number;
  publishedUrls: string[];
  errors: string[];
}
