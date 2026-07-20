"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { PipelineSummary } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

export default function AdminPage() {
  const [tema, setTema] = useState("");
  const [keywordBase, setKeywordBase] = useState("");
  const [categoria, setCategoria] = useState("cursos");
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
          tema: tema.trim(),
          keywordBase: keywordBase.trim() || undefined,
          categoria: categoria.trim() || "cursos",
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-950">
          <span className="rounded-sm bg-brand-400 px-1.5 py-0.5">Panel interno</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Generar artículo SEO
        </h1>
        <p className="mt-3 text-ink-600 leading-relaxed">
          Escribe el tema del artículo (el enfoque del contenido). La palabra
          clave SEO es opcional y solo ayuda al posicionamiento; no reemplaza
          el tema.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-ink-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="tema"
            className="mb-1.5 block text-sm font-semibold text-ink-800"
          >
            Tema del artículo <span className="text-red-600">*</span>
          </label>
          <textarea
            id="tema"
            name="tema"
            required
            rows={3}
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="ej. Cómo crear un ebook de forma sencilla y subir tu contenido en Lernymart"
            disabled={isLoading}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-400/40 placeholder:text-ink-400 focus:border-ink-950 focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="keywordBase"
            className="mb-1.5 block text-sm font-semibold text-ink-800"
          >
            Palabra clave SEO{" "}
            <span className="font-normal text-ink-500">(opcional)</span>
          </label>
          <input
            id="keywordBase"
            name="keywordBase"
            value={keywordBase}
            onChange={(e) => setKeywordBase(e.target.value)}
            placeholder="ej. creación de ebooks"
            disabled={isLoading}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-400/40 placeholder:text-ink-400 focus:border-ink-950 focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
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
            placeholder="cursos"
            disabled={isLoading}
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-400/40 placeholder:text-ink-400 focus:border-ink-950 focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !tema.trim()}
          className="inline-flex w-full items-center justify-center rounded-md bg-ink-950 px-4 py-3 text-sm font-semibold text-brand-400 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-400" />
              Generando… (puede tardar 1–2 min)
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
        <div className="mt-6 rounded-lg border border-ink-950 bg-brand-100 px-4 py-4 text-sm text-ink-900">
          <p className="font-semibold text-ink-950">Pipeline completado</p>
          <ul className="mt-3 space-y-1 text-ink-800">
            <li>Briefs: {result.briefsGenerated}</li>
            <li>Publicados: {result.articlesPublished}</li>
          </ul>

          {result.publishedUrls.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="font-semibold text-ink-950">Artículo publicado:</p>
              {result.publishedUrls.map((url) => (
                <Link
                  key={url}
                  href={url}
                  className="block font-medium text-ink-950 underline decoration-brand-400 underline-offset-2 hover:decoration-brand-500"
                >
                  {url}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-ink-700">
              No se publicó el artículo. Revisa las advertencias abajo.
            </p>
          )}

          {result.errors.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-ink-950">
                Advertencias ({result.errors.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-800">
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
