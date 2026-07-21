/**
 * Limpia HTML del markdown para evitar duplicar H1 / FAQs / conclusión
 * que la página renderiza aparte.
 */

const SECTION_HEADING =
  /^(faqs?|preguntas\s+frecuentes|conclusi[oó]n(?:\s+y\s+cta)?|conclusiones|cta\s+final|pr[oó]ximo\s+paso)$/i;

function textContent(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Quita el primer H1 del cuerpo (el título se muestra fuera del markdown). */
export function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
}

/** Elimina secciones H2 de FAQs / Conclusión / CTA del HTML del markdown. */
export function stripDuplicateTailSections(html: string): string {
  const parts = html.split(/(?=<h2\b[^>]*>)/i);
  if (parts.length <= 1) return html;

  const kept: string[] = [];
  for (const part of parts) {
    const headingMatch = part.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (!headingMatch) {
      kept.push(part);
      continue;
    }
    const headingText = textContent(headingMatch[1]);
    if (SECTION_HEADING.test(headingText)) {
      continue;
    }
    kept.push(part);
  }
  return kept.join("");
}

export function prepareArticleBodyHtml(html: string): string {
  return stripDuplicateTailSections(stripLeadingH1(html)).trim();
}

export function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|[\]()-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
