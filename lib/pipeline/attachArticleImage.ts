import { generateArticleImage } from "@/lib/pollinations";
import { getSupabase } from "@/lib/supabase";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

const BUCKET = "article-images";

const CATEGORY_VISUAL: Record<string, string> = {
  cursos:
    "online learning scene, open laptop, notebooks, soft desk light",
  ebooks: "floating digital book pages, soft glow, cozy reading desk",
  "educacion-online": "remote education, headset and laptop, bright study space",
  emprendimiento: "startup energy, rising abstract arrows, sunrise window",
  "marketing-digital":
    "digital marketing mood, abstract analytics curves, neon accents",
  negocios: "professional business workspace, soft bokeh city lights",
  tecnologia: "futuristic technology, glowing circuit patterns, sleek devices",
  "desarrollo-personal": "personal growth path on mountains, calm sunrise",
  diseno: "creative design studio, bold geometric shapes",
  general: "education marketplace, modern learning hub, warm light",
};

const CATEGORY_STOCK_TAGS: Record<string, string> = {
  cursos: "laptop,study,education",
  ebooks: "book,reading,desk",
  "educacion-online": "computer,student,online",
  emprendimiento: "startup,office,business",
  "marketing-digital": "marketing,analytics,laptop",
  negocios: "business,meeting,office",
  tecnologia: "technology,code,computer",
  "desarrollo-personal": "mountain,sunrise,path",
  diseno: "design,creative,colors",
  general: "education,learning,workspace",
};

const ES_EN: Record<string, string> = {
  ganar: "earning",
  dinero: "money",
  extra: "extra",
  ebook: "ebook",
  ebooks: "ebooks",
  curso: "course",
  cursos: "courses",
  online: "online",
  vender: "selling",
  venta: "sales",
  marketing: "marketing",
  digital: "digital",
  plataforma: "platform",
  plataformas: "platforms",
  mejores: "best",
  generar: "generating",
  ingresos: "income",
  crear: "creating",
  como: "how to",
  hacer: "making",
  aprender: "learning",
  educacion: "education",
  negocio: "business",
  negocios: "business",
  emprendimiento: "entrepreneurship",
  tecnologia: "technology",
  diseno: "design",
  dormiendo: "while sleeping",
  pasivo: "passive",
  estudiantes: "students",
  captar: "attracting",
  estrategias: "strategies",
  atraer: "attract",
};

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function topicToEnglish(tema: string, keyword?: string): string {
  const source = `${tema} ${keyword ?? ""}`.trim();
  const words = stripDiacritics(source.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const translated = words
    .map((w) => ES_EN[w] ?? (/^[a-z]+$/.test(w) && w.length > 2 ? w : ""))
    .filter(Boolean);

  const unique = Array.from(new Set(translated)).slice(0, 8);
  return unique.join(" ") || "online education and digital learning";
}

export function buildImagePrompt(input: {
  tema: string;
  tituloH1: string;
  categoria: string;
  keywordPrincipal?: string;
}): string {
  const categoria = input.categoria.trim().toLowerCase() || "general";
  const visual =
    CATEGORY_VISUAL[categoria] ??
    CATEGORY_VISUAL.general ??
    "modern education mood";

  const topic = topicToEnglish(
    input.tema,
    input.keywordPrincipal || input.tituloH1
  );

  return [
    "Eye-catching wide blog header, cinematic 16:9 banner",
    `subject: ${topic}`,
    `scene: ${visual}`,
    "vibrant professional editorial style, bold focal point",
    "absolutely no text, no letters, no words, no typography, no watermarks, no logos",
  ].join(". ");
}

async function ensurePublicBucket(): Promise<void> {
  const supabase = getSupabase();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(
      `No se pudo listar buckets de Storage: ${listError.message}`
    );
  }
  const exists = (buckets ?? []).some((b) => b.name === BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(
      `No existe el bucket público "${BUCKET}" y no se pudo crear: ${error.message}. Créalo en Supabase → Storage (Public).`
    );
  }
}

/** Foto de stock siempre disponible (sin API key). */
async function fetchStockHeroImage(
  slug: string,
  categoria: string
): Promise<Buffer> {
  const tags =
    CATEGORY_STOCK_TAGS[categoria.trim().toLowerCase()] ??
    CATEGORY_STOCK_TAGS.general ??
    "education,learning";
  const seed = encodeURIComponent(slug.slice(0, 40) || "lernymart");

  const candidates = [
    `https://loremflickr.com/1280/720/${encodeURIComponent(tags)}/all?lock=${seed}`,
    `https://picsum.photos/seed/${seed}/1280/720`,
  ];

  let lastMsg = "";
  for (const url of candidates) {
    try {
      console.info("[attachArticleImage] stock fetch", { url });
      const response = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "image/*" },
      });
      if (!response.ok) {
        lastMsg = `HTTP ${response.status}`;
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000) {
        lastMsg = "imagen demasiado pequeña";
        continue;
      }
      return buffer;
    } catch (err) {
      lastMsg = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Fallback stock falló: ${lastMsg}`);
}

export async function uploadArticleImage(
  slug: string,
  image: Buffer
): Promise<string> {
  await ensurePublicBucket();
  const supabase = getSupabase();

  const isJpeg = image[0] === 0xff && image[1] === 0xd8;
  const ext = isJpeg ? "jpg" : "png";
  const contentType = isJpeg ? "image/jpeg" : "image/png";
  const path = `${slug}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, image, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.error("[attachArticleImage] storage upload failed", error);
    throw new Error(`No se pudo subir la imagen a Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("No se pudo obtener la URL pública de la imagen.");
  }
  console.info("[attachArticleImage] uploaded", { path, url: data.publicUrl });
  return data.publicUrl;
}

export type AttachImageResult = {
  imagenUrl: string;
  source: "pollinations" | "stock";
  warning?: string;
};

/**
 * Intenta Pollinations; si falla, usa foto stock y SIEMPRE deja imagen_url.
 */
export async function attachArticleImage(
  article: Article,
  categoria: string
): Promise<AttachImageResult> {
  const prompt = buildImagePrompt({
    tema: article.tema,
    tituloH1: article.tituloH1,
    categoria,
    keywordPrincipal: article.keywordPrincipal,
  });

  console.info("[attachArticleImage] start", {
    slug: article.slug,
    id: article.id,
    categoria,
    promptChars: prompt.length,
    pollinationsKeyPresent: Boolean(
      process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY
    ),
  });

  let buffer: Buffer;
  let source: AttachImageResult["source"] = "pollinations";
  let warning: string | undefined;

  try {
    buffer = await generateArticleImage(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[attachArticleImage] Pollinations falló, uso stock", msg);
    warning = `Pollinations falló (${msg}). Se usó imagen stock de respaldo.`;
    buffer = await fetchStockHeroImage(article.slug, categoria);
    source = "stock";
  }

  const publicUrl = await uploadArticleImage(article.slug, buffer);

  const updated = await articlesStore.update(article.id, {
    imagenUrl: publicUrl,
  });
  if (!updated) {
    throw new Error(
      `No se pudo guardar imagen_url en articles (id=${article.id}). ¿Existe la columna imagen_url?`
    );
  }

  return { imagenUrl: publicUrl, source, warning };
}
