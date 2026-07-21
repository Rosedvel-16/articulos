import { generateArticleImage } from "@/lib/pollinations";
import { getSupabase } from "@/lib/supabase";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

const BUCKET = "article-images";

/** Estilos visuales en INGLÉS por categoría (sin pedir texto en la imagen). */
const CATEGORY_VISUAL: Record<string, string> = {
  cursos:
    "online learning scene, open laptop, notebooks, soft desk light, inspired students silhouette without faces",
  ebooks:
    "floating digital book pages, soft glow, cozy reading desk, warm lamp light, modern publishing mood",
  "educacion-online":
    "remote education, video call abstract shapes, headset and laptop, bright modern study space",
  emprendimiento:
    "startup energy, rising abstract arrows, creative desk with sticky notes as blank shapes only, sunrise window",
  "marketing-digital":
    "digital marketing mood, abstract social icons as simple shapes, analytics curves, neon accents on dark desk",
  negocios:
    "professional business workspace, glass buildings soft bokeh, growth charts as abstract lines, confident atmosphere",
  tecnologia:
    "futuristic technology, glowing circuit patterns, sleek devices, deep blue and gold light",
  "desarrollo-personal":
    "personal growth metaphor, ascending path on mountains, calm sunrise, hopeful cinematic light",
  diseno:
    "creative design studio, bold geometric shapes, color swatches as abstract blocks, artistic composition",
  general:
    "education marketplace atmosphere, knowledge sharing, modern learning hub, warm inviting light",
};

/** Glosario corto ES → EN para no mandar español al modelo (evita que intente “escribir” el título). */
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
};

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Convierte el tema a un topic corto en inglés (sin frases largas ni títulos literales). */
export function topicToEnglish(tema: string, keyword?: string): string {
  const source = `${tema} ${keyword ?? ""}`.trim();
  const words = stripDiacritics(source.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const translated = words
    .map((w) => ES_EN[w] ?? ( /^[a-z]+$/.test(w) && w.length > 2 ? w : ""))
    .filter(Boolean);

  const unique = Array.from(new Set(translated)).slice(0, 8);
  return unique.join(" ") || "online education and digital learning";
}

/**
 * Prompt SOLO en inglés, llamativo, acorde al blog, y con prohibición fuerte de texto.
 * No incluye el título en español (los modelos de difusión lo “escriben” mal).
 */
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
    "modern education and digital business mood";

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
    console.warn("[attachArticleImage] listBuckets", listError.message);
  }
  const exists = (buckets ?? []).some((b) => b.name === BUCKET);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.warn("[attachArticleImage] createBucket", error.message);
  }
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

/**
 * Genera imagen con Pollinations, la sube a Storage y actualiza articles.imagen_url.
 */
export async function attachArticleImage(
  article: Article,
  categoria: string
): Promise<string> {
  const prompt = buildImagePrompt({
    tema: article.tema,
    tituloH1: article.tituloH1,
    categoria,
    keywordPrincipal: article.keywordPrincipal,
  });

  console.info("[attachArticleImage] prompt", {
    slug: article.slug,
    prompt,
  });

  const buffer = await generateArticleImage(prompt);
  const publicUrl = await uploadArticleImage(article.slug, buffer);

  const updated = await articlesStore.update(article.id, {
    imagenUrl: publicUrl,
  });
  if (!updated) {
    throw new Error("No se pudo guardar imagen_url en articles.");
  }

  return publicUrl;
}
