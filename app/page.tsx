import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <section className="relative overflow-hidden rounded-2xl border border-ink-900 bg-ink-950 px-8 py-14 text-white shadow-xl md:px-14 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 28%, rgba(255,214,0,0.28), transparent 42%), radial-gradient(circle at 88% 72%, rgba(255,214,0,0.12), transparent 38%)",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
            Entorno de prueba
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Pipeline SEO de artículos para laboratorios clínicos
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Prototipo que replica el flujo n8n de lernymart (keywords → tendencias →
            aprobación → brief → artículo → publicación) con TypeScript y
            persistencia en Supabase.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-md bg-brand-400 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-brand-300"
            >
              Generar artículo
            </Link>
            <Link
              href="/blog"
              className="rounded-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-brand-400 hover:text-brand-400"
            >
              Ver blog de prueba
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-8 md:grid-cols-3">
        {[
          {
            title: "5 etapas",
            body: "Expandir keywords, analizar tendencias, aprobar, brief SEO y artículo final con FAQ + CTA.",
          },
          {
            title: "Mismo scoring que n8n",
            body: "Las reglas de oportunidad, estacionalidad y aprobación están portadas tal cual del workflow original.",
          },
          {
            title: "Listo para Vercel",
            body: "Next.js App Router + TypeScript + Supabase. Los artículos se publican en este mismo sitio (/blog).",
          },
        ].map((item) => (
          <div key={item.title} className="border-t-2 border-brand-400 pt-4">
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {item.title}
            </h2>
            <p className="mt-2 text-ink-600 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
