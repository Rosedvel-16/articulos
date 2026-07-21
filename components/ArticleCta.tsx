import { Rocket } from "lucide-react";

interface ArticleCtaProps {
  text: string;
}

export function ArticleCta({ text }: ArticleCtaProps) {
  if (!text) return null;

  return (
    <aside className="mt-12 rounded-xl border border-ink-950 bg-ink-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-400 text-ink-950">
          <Rocket className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-brand-400">
          Próximo paso
        </p>
        <p className="mt-3 text-white/85 leading-relaxed">{text}</p>
      </div>
    </aside>
  );
}
