import { NextResponse } from "next/server";
import { articlesStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const articles = await articlesStore.getPublished();
    // Más recientes primero
    articles.sort(
      (a, b) =>
        Date.parse(b.fechaPublicacion || b.fechaGeneracion) -
        Date.parse(a.fechaPublicacion || a.fechaGeneracion)
    );
    return NextResponse.json(articles);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/articles]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
