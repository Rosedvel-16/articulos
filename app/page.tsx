import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
      <section className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-950 via-brand-900 to-ink-950 px-8 py-14 text-white shadow-xl md:px-14 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(125,201,184,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(174,224,212,0.2), transparent 35%)",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">
            Entorno de prueba
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Pipeline SEO de artículos para laboratorios clínicos
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-100/90">
            Prototipo que replica el flujo n8n de lernymart (keywords → tendencias →
            aprobación → brief → artículo → publicación) con TypeScript y
            almacenamiento JSON local.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-md bg-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-200"
            >
              Generar artículo
            </Link>
            <Link
              href="/blog"
              className="rounded-md border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
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
            body: "Next.js App Router + TypeScript. El JSON local es temporal; en producción va a Postgres/KV + WordPress.",
          },
        ].map((item) => (
          <div key={item.title} className="border-t-2 border-brand-400 pt-4">
            <h2 className="font-display text-xl font-semibold text-ink-900">
              {item.title}
            </h2>
            <p className="mt-2 text-ink-600 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
