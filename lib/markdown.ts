import { marked } from "marked";

export async function markdownToHtml(md: string): Promise<string> {
  return marked.parse(md, {
    async: true,
    gfm: true,
    breaks: false,
  });
}
