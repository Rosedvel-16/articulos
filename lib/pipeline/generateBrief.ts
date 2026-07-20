import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/openrouter";
import { articleBriefsStore } from "@/lib/storage";
import type { ArticleBrief, BriefRaw } from "@/types";

const SYSTEM_PROMPT =
  "Eres un estratega SEO senior especializado en educación online, marketplaces de cursos, creación de contenido digital y marcas como Lernymart. Construye briefs SEO profesionales: el TEMA del usuario es el eje del artículo (no inventes otro enfoque), analiza intención, estructura semántica, evita keyword stuffing, prioriza CTR, títulos naturales optimizados para Google. SOLO JSON.";

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
}

export async function generateBrief(
  input: GenerateBriefInput
): Promise<ArticleBrief> {
  const tema = input.tema.trim();
  const keywordBase = input.keywordBase.trim() || tema;
  const categoria = input.categoria.trim() || "cursos";

  const userPrompt = JSON.stringify({
    tema_central: tema,
    keyword_seo_opcional: keywordBase,
    categoria,
    mercado: "Perú / Latam",
    marca: "Lernymart",
    contexto_negocio:
      "Lernymart es una plataforma donde las personas pueden comprar y vender cursos. El blog debe aportar valor educativo y, cuando encaje naturalmente, mencionar cómo Lernymart ayuda a crear, subir o comercializar contenido/cursos.",
    formato_respuesta: {
      tema: "string — debe reflejar el tema_central del usuario",
      titulo_h1: "string — atractivo, no obligatorio que sea igual al tema",
      estructura_h2: ["string"],
      keyword_principal: "string",
      keywords_secundarias: ["string"],
      meta_title: "string — máximo 60 caracteres",
      meta_description: "string — máximo 155 caracteres",
      slug: "string-url-amigable",
      score_seo: "number 0-100",
    },
    reglas: [
      "El artículo DEBE girar alrededor del tema_central ingresado por el usuario",
      "La keyword SEO es apoyo; no reemplace el tema",
      "Tono profesional, claro y útil",
      "Puedes mencionar Lernymart de forma natural, sin spam",
      "meta_title máx 60 caracteres",
      "meta_description máx 155 caracteres",
    ],
  });

  const raw = await callOpenRouter<BriefRaw>(SYSTEM_PROMPT, userPrompt);

  const tituloH1 = String(raw.titulo_h1 ?? "").trim();
  const slugRaw = String(raw.slug ?? (tituloH1 || tema || keywordBase)).trim();
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
      : 70;

  const brief: ArticleBrief = {
    idArticulo: randomUUID(),
    keywordBase,
    fechaGeneracion: new Date().toISOString(),
    tema: String(raw.tema ?? tema).trim() || tema,
    tituloH1: tituloH1 || tema,
    estructuraH2,
    keywordPrincipal: String(raw.keyword_principal ?? keywordBase).trim(),
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

  await articleBriefsStore.insert(brief);
  return brief;
}
