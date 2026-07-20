"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { KeywordReviewItem, PipelineSummary } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

function statusLabel(status: KeywordReviewItem["status"]): string {
  switch (status) {
    case "aprobada":
      return "Aprobada";
    case "descartada":
      return "Descartada";
    case "sin_datos":
      return "Sin datos de búsqueda";
    case "error":
      return "No evaluada";
    default:
      return status;
  }
}

function statusClasses(status: KeywordReviewItem["status"]): string {
  switch (status) {
    case "aprobada":
      return "border-ink-950 bg-ink-950 text-brand-400";
    case "descartada":
      return "border-ink-300 bg-ink-100 text-ink-700";
    case "sin_datos":
      return "border-ink-400 bg-white text-ink-700";
    case "error":
      return "border-ink-800 bg-ink-50 text-ink-800";
    default:
      return "border-ink-200 bg-white text-ink-700";
  }
}

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
          keywordBase: keywordBase.trim(),
          categoria: categoria.trim() || "cursos",
        }),
      });

      const data = (await response.json()) as
        | PipelineSummary
        | { error: string };

      if (!response.ok) {
        const msg =
          "error" in data
            ? data.error
            : "No se pudo completar la generación del artículo";
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

  const approved = useMemo(
    () => result?.keywordReviews.filter((k) => k.status === "aprobada") ?? [],
    [result]
  );
  const rejected = useMemo(
    () =>
      result?.keywordReviews.filter((k) => k.status !== "aprobada") ?? [],
    [result]
  );

  const published = (result?.articlesPublished ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-950">
          <span className="rounded-sm bg-brand-400 px-1.5 py-0.5">
            Panel interno
          </span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 md:text-4xl">
          Generar artículo SEO
        </h1>
        <p className="mt-3 text-ink-600 leading-relaxed">
          El <strong className="font-semibold text-ink-900">tema</strong> define
          de qué trata el artículo. La{" "}
          <strong className="font-semibold text-ink-900">palabra clave</strong>{" "}
          define si hay oportunidad real de posicionamiento: se expanden
          variaciones, se evalúan con Google Trends y solo si alguna aprueba se
          genera y publica el artículo.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 border border-ink-200 bg-white p-6"
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
                rows={4}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="ej. Cómo crear un ebook de forma sencilla y subir tu contenido en Lernymart"
                disabled={isLoading}
                className="w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none ring-brand-400/40 placeholder:text-ink-400 focus:border-ink-950 focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs text-ink-500">
                No es el título final. Es el enfoque del contenido.
              </p>
            </div>

            <div>
              <label
                htmlFor="keywordBase"
                className="mb-1.5 block text-sm font-semibold text-ink-800"
              >
                Palabra clave SEO <span className="text-red-600">*</span>
              </label>
              <input
                id="keywordBase"
                name="keywordBase"
                required
                value={keywordBase}
                onChange={(e) => setKeywordBase(e.target.value)}
                placeholder="ej. crear ebook"
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
              disabled={isLoading || !tema.trim() || !keywordBase.trim()}
              className="inline-flex w-full items-center justify-center rounded-md bg-ink-950 px-4 py-3 text-sm font-semibold text-brand-400 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-400" />
                  Evaluando keywords y generando…
                </span>
              ) : (
                "Generar artículo"
              )}
            </button>
          </form>

          <aside className="border border-ink-950 bg-ink-950 px-5 py-5 text-sm text-white">
            <p className="font-semibold text-brand-400">
              Cuidado al elegir la palabra clave
            </p>
            <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
              <li>
                Usa búsquedas reales y concretas (ej.{" "}
                <span className="text-white">crear ebook</span>,{" "}
                <span className="text-white">vender cursos online</span>).
              </li>
              <li>
                Evita frases muy largas o demasiado específicas: si Google Trends
                no tiene datos en Perú, la keyword se descarta y no se publica
                artículo.
              </li>
              <li>
                Solo las keywords aprobadas por volumen e intención SEO avanzan
                a brief y publicación.
              </li>
            </ul>
          </aside>
        </div>

        <div className="space-y-5">
          {status === "error" && errorMessage && (
            <div
              role="alert"
              className="border border-ink-950 bg-white px-5 py-4 text-sm text-ink-900"
            >
              <p className="font-semibold">No se pudo completar</p>
              <p className="mt-2 text-ink-700">{errorMessage}</p>
            </div>
          )}

          {status === "loading" && (
            <div className="border border-ink-200 bg-white px-5 py-10 text-center text-sm text-ink-600">
              <span className="mx-auto mb-3 block h-5 w-5 animate-spin rounded-full border-2 border-ink-300 border-t-ink-950" />
              Expandiendo keywords, consultando tendencias y evaluando
              oportunidades SEO…
            </div>
          )}

          {status === "success" && result && (
            <>
              <section
                className={`border px-5 py-5 ${
                  published
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-ink-300 bg-white text-ink-900"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    published ? "text-brand-400" : "text-ink-500"
                  }`}
                >
                  {published ? "Artículo publicado" : "Sin publicación"}
                </p>
                <h2
                  className={`mt-2 font-display text-2xl font-semibold ${
                    published ? "text-white" : "text-ink-950"
                  }`}
                >
                  {published
                    ? "Hay oportunidad SEO y el artículo ya está en el blog"
                    : "Ninguna keyword pasó la evaluación SEO"}
                </h2>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    published ? "text-white/75" : "text-ink-600"
                  }`}
                >
                  {published
                    ? "Se generó el brief y el artículo usando tu tema como eje, y la keyword aprobada para SEO."
                    : "Prueba una keyword más corta, más buscada o más general. El tema puede quedarse igual."}
                </p>

                <div
                  className={`mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 ${
                    published ? "text-white/90" : "text-ink-800"
                  }`}
                >
                  <div className="border-t border-current/20 pt-2">
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      Variaciones
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.relatedKeywordsCount}
                    </p>
                  </div>
                  <div className="border-t border-current/20 pt-2">
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      Evaluadas
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.trendsAnalyzed}
                    </p>
                  </div>
                  <div className="border-t border-current/20 pt-2">
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      Aprobadas
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.approvedCount}
                    </p>
                  </div>
                  <div className="border-t border-current/20 pt-2">
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      Publicados
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {result.articlesPublished}
                    </p>
                  </div>
                </div>

                {result.publishedUrls.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {result.publishedUrls.map((url) => (
                      <Link
                        key={url}
                        href={url}
                        className="block text-sm font-semibold text-brand-400 underline underline-offset-2 hover:text-brand-300"
                      >
                        Ver artículo → {url}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="border border-ink-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink-950">Aprobadas</h3>
                    <span className="rounded-sm bg-ink-950 px-2 py-0.5 text-xs font-semibold text-brand-400">
                      {approved.length}
                    </span>
                  </div>
                  {approved.length === 0 ? (
                    <p className="text-sm text-ink-500">
                      Ninguna keyword cumplió los criterios SEO.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {approved.map((item) => (
                        <li
                          key={item.keyword}
                          className="border-l-2 border-brand-400 pl-3"
                        >
                          <p className="text-sm font-medium text-ink-950">
                            {item.keyword}
                          </p>
                          <p className="mt-1 text-xs text-ink-600">
                            {item.motivo}
                          </p>
                          {typeof item.interesScore === "number" && (
                            <p className="mt-1 text-xs text-ink-500">
                              Interés {item.interesScore} · Prioridad{" "}
                              {item.prioridadSeo}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-ink-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink-950">No avanzaron</h3>
                    <span className="rounded-sm border border-ink-300 px-2 py-0.5 text-xs font-semibold text-ink-700">
                      {rejected.length}
                    </span>
                  </div>
                  {rejected.length === 0 ? (
                    <p className="text-sm text-ink-500">
                      Todas las evaluadas fueron aprobadas.
                    </p>
                  ) : (
                    <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                      {rejected.map((item) => (
                        <li
                          key={item.keyword}
                          className="border-l-2 border-ink-300 pl-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-ink-900">
                              {item.keyword}
                            </p>
                            <span
                              className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-600">
                            {item.motivo}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}

          {status === "idle" && (
            <div className="border border-dashed border-ink-300 bg-white px-5 py-10 text-sm text-ink-500">
              Aquí verás el resultado: keywords aprobadas, descartadas y el
              enlace al artículo si se publica.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
