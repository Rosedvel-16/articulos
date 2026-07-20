import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-950">
        Artículo no encontrado
      </h1>
      <p className="mt-3 text-ink-600">
        Ese slug no existe o el artículo aún no está publicado.
      </p>
      <Link
        href="/blog"
        className="mt-6 inline-block text-sm font-semibold text-ink-950 underline decoration-brand-400 underline-offset-2"
      >
        Ir al blog
      </Link>
    </div>
  );
}
