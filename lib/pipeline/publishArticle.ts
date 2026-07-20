/**
 * Etapa 6 del pipeline n8n: "publicar" el artículo.
 *
 * En n8n esto era el nodo "Create a post" → WordPress REST API.
 * Aquí publicamos en este mismo sitio de prueba (/blog/[slug]).
 *
 * TODO: Cuando conectemos con el sitio real de lernymart, reemplazar esta
 * función por una llamada a la REST API de WordPress
 * (POST /wp-json/wp/v2/posts) igual que hacía el nodo 'Create a post' en n8n.
 */

import { marked } from "marked";
import { articlesStore } from "@/lib/storage";
import type { Article } from "@/types";

/**
 * Convierte markdown a HTML, persiste el Article como "publicado"
 * y asigna urlPublicacion = "/blog/" + slug.
 */
export async function publishArticle(article: Article): Promise<{
  article: Article;
  html: string;
}> {
  const html = await marked.parse(article.articuloMd, {
    async: true,
    gfm: true,
    breaks: false,
  });

  const published: Article = {
    ...article,
    estado: "publicado",
    fechaPublicacion: new Date().toISOString(),
    urlPublicacion: `/blog/${article.slug}`,
  };

  // Evitar duplicados por slug: si ya existe, actualizar; si no, insertar.
  const existing = await articlesStore.getBySlug(article.slug);
  if (existing) {
    const updated = await articlesStore.update(existing.idArticulo, published);
    return { article: updated ?? published, html };
  }

  await articlesStore.insert(published);
  return { article: published, html };
}

/**
 * Helper para renderizar markdown → HTML en páginas del blog.
 */
export async function markdownToHtml(md: string): Promise<string> {
  return marked.parse(md, {
    async: true,
    gfm: true,
    breaks: false,
  });
}
