"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { PipelineSummary } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

export default function AdminPage() {
  const [keywordBase, setKeywordBase] = useState("");
  const [categoria, setCategoria] = useState("laboratorios clínicos");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineSummary | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywordBase: keywordBase.trim(),
          categoria: categoria.trim() || "general",
        }),
      });

      const data = (await response.json()) as
        | PipelineSummary
        | { error: string };

      if (!response.ok) {
        const msg =
          "error" in data ? data.error : "Error desconocido al ejecutar el pipeline";
        throw new Error(msg);
      }

      setResult(data as PipelineSummary);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Panel interno
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Generar artículo SEO
        </h1>
        <p className="mt-3 text-ink-600 leading-relaxed">
          Ejecuta el pipeline completo: expansión de keywords, Google Trends,
          aprobación editorial, brief y publicación en el blog de prueba.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-brand-200/80 bg-white/80 p-6 shadow-sm backdrop-blur"
      >
        <div>
          <label
            htmlFor="keywordBase"
            className="mb-1.5 block text-sm font-semibold text-ink-800"
          >
            Palabra clave <span className="text-red-600">*</span>
          </label>
          <input
            id="keywordBase"
            name="keywordBase"
            required
            value={keywordBase}
            onChange={(e) => setKeywordBase(e.target.value)}
            placeholder="ej. precio hemograma completo Lima"
            disabled={isLoading}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-500/30 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="categoria"
            className="mb-1.5 block text-sm font-semibold text-ink-800"
          >
            Categoría
          </label>
          <input
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="laboratorios clínicos"
            disabled={isLoading}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-500/30 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !keywordBase.trim()}
          className="inline-flex w-full items-center justify-center rounded-md bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Generando… (puede tardar 1–3 min)
            </span>
          ) : (
            "Generar artículo"
          )}
        </button>
      </form>

      {status === "error" && errorMessage && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-semibold">Error</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      )}

      {status === "success" && result && (
        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50/80 px-4 py-4 text-sm text-ink-800">
          <p className="font-semibold text-brand-900">Pipeline completado</p>
          <ul className="mt-3 space-y-1 text-ink-700">
            <li>Keywords relacionadas: {result.relatedKeywordsCount}</li>
            <li>Tendencias analizadas: {result.trendsAnalyzed}</li>
            <li>Aprobadas: {result.approvedCount}</li>
            <li>Briefs: {result.briefsGenerated}</li>
            <li>Publicados: {result.articlesPublished}</li>
          </ul>

          {result.publishedUrls.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="font-semibold text-brand-900">Artículos publicados:</p>
              {result.publishedUrls.map((url) => (
                <Link
                  key={url}
                  href={url}
                  className="block font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600"
                >
                  {url}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-ink-600">
              No se publicó ningún artículo (ninguna keyword pasó la aprobación o
              hubo errores en la generación).
            </p>
          )}

          {result.errors.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-amber-800">
                Advertencias ({result.errors.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
