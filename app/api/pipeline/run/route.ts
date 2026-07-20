import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/runPipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RunBody {
  tema?: unknown;
  keywordBase?: unknown;
  categoria?: unknown;
  maxKeywordsToAnalyze?: unknown;
  maxArticlesToPublish?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RunBody;

    const tema = typeof body.tema === "string" ? body.tema.trim() : "";
    const keywordBase =
      typeof body.keywordBase === "string" ? body.keywordBase.trim() : "";
    const categoria =
      typeof body.categoria === "string" && body.categoria.trim()
        ? body.categoria.trim()
        : "cursos";

    if (!tema) {
      return NextResponse.json(
        { error: "El campo tema es requerido" },
        { status: 400 }
      );
    }
    if (!keywordBase) {
      return NextResponse.json(
        { error: "El campo palabra clave es requerido" },
        { status: 400 }
      );
    }

    const maxKeywordsToAnalyze =
      typeof body.maxKeywordsToAnalyze === "number"
        ? body.maxKeywordsToAnalyze
        : 8;
    const maxArticlesToPublish =
      typeof body.maxArticlesToPublish === "number"
        ? body.maxArticlesToPublish
        : 1;

    const result = await runPipeline({
      tema,
      keywordBase,
      categoria,
      maxKeywordsToAnalyze,
      maxArticlesToPublish,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/pipeline/run]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
