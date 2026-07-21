import { generateArticleImage } from "@/lib/huggingface";
import { getSupabase } from "@/lib/supabase";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

const BUCKET = "article-images";

const CATEGORY_STYLE: Record<string, string> = {
  cursos: "online courses and learning, laptop and notebooks",
  ebooks: "digital ebooks and reading, clean education publishing",
  "educacion-online": "online education, remote learning, modern classroom",
  emprendimiento: "entrepreneurship, startup growth, business ideas",
  "marketing-digital": "digital marketing, analytics charts, social media icons abstract",
  negocios: "business strategy, professional workspace, growth",
  tecnologia: "technology, abstract digital networks, modern devices",
  "desarrollo-personal": "personal growth, focus and motivation, abstract path",
  diseno: "creative design studio, shapes and composition",
  general: "education marketplace, learning and knowledge sharing",
};

function buildImagePrompt(input: {
  tema: string;
  tituloH1: string;
  categoria: string;
}): string {
  const categoria = input.categoria.trim().toLowerCase() || "general";
  const style =
    CATEGORY_STYLE[categoria] ??
    CATEGORY_STYLE.general ??
    "education and digital business";

  const tema = input.tema.trim() || input.tituloH1.trim();
  const titulo = input.tituloH1.trim();

  return [
    `Professional editorial illustration about "${tema}"`,
    titulo && titulo !== tema ? `(article theme: ${titulo})` : "",
    `visual style: ${style}`,
    "flat design, blog header image, wide banner composition",
    "no text, no letters, no words, no watermark, no logo typography",
    "corporate clean style, warm color palette, high quality",
  ]
    .filter(Boolean)
    .join(", ");
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
  const path = `${slug}.png`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, image, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    throw new Error(`No se pudo subir la imagen a Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("No se pudo obtener la URL pública de la imagen.");
  }
  return data.publicUrl;
}

/**
 * Genera imagen HF, la sube a Storage y actualiza articles.imagen_url.
 * No cambia el estado del artículo (eso lo hace runPipeline).
 */
export async function attachArticleImage(
  article: Article,
  categoria: string
): Promise<string> {
  const prompt = buildImagePrompt({
    tema: article.tema,
    tituloH1: article.tituloH1,
    categoria,
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
