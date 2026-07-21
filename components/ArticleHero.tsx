import { ARTICLE_CATEGORIES } from "@/lib/categories";

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function resolveCategoryLabel(seed: string): string {
  const normalized = seed.trim().toLowerCase();
  const match = ARTICLE_CATEGORIES.find(
    (c) =>
      c.value === normalized ||
      c.label.toLowerCase() === normalized ||
      normalized.includes(c.value.replace(/-/g, " "))
  );
  return match?.label ?? (seed.trim() || "General");
}

interface ArticleHeroProps {
  title: string;
  categorySeed: string;
  imageUrl?: string;
}

export function ArticleHero({
  title,
  categorySeed,
  imageUrl,
}: ArticleHeroProps) {
  const label = resolveCategoryLabel(categorySeed);
  const seed = hashSeed(categorySeed || title);
  const angle = 20 + (seed % 50);
  const pattern = seed % 3;
  const offsetX = (seed % 40) - 20;
  const offsetY = ((seed >> 3) % 40) - 20;

  const gradientId = `hero-grad-${seed.toString(16)}`;
  const patternId = `hero-pat-${seed.toString(16)}`;
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div className="relative mt-6 w-full overflow-hidden border-y border-ink-950 bg-ink-950">
      <div className="relative h-[320px] w-full md:h-[380px]">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1200 380"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
                gradientTransform={`rotate(${angle})`}
              >
                <stop offset="0%" stopColor="#0a0a0a" />
                <stop offset="45%" stopColor="#171717" />
                <stop offset="100%" stopColor="#ffd600" stopOpacity="0.85" />
              </linearGradient>
              {pattern === 0 && (
                <pattern
                  id={patternId}
                  width="48"
                  height="48"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${offsetX} ${offsetY})`}
                >
                  <path
                    d="M0 48 L48 0"
                    stroke="#ffd600"
                    strokeOpacity="0.18"
                    strokeWidth="1.5"
                  />
                </pattern>
              )}
              {pattern === 1 && (
                <pattern
                  id={patternId}
                  width="36"
                  height="36"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${offsetX} ${offsetY}) rotate(${angle / 4})`}
                >
                  <circle
                    cx="6"
                    cy="6"
                    r="3"
                    fill="#ffd600"
                    fillOpacity="0.22"
                  />
                </pattern>
              )}
              {pattern === 2 && (
                <pattern
                  id={patternId}
                  width="56"
                  height="56"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${offsetX} ${offsetY})`}
                >
                  <rect
                    x="2"
                    y="2"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="#ffd600"
                    strokeOpacity="0.2"
                    strokeWidth="1.5"
                  />
                </pattern>
              )}
            </defs>
            <rect width="1200" height="380" fill={`url(#${gradientId})`} />
            <rect width="1200" height="380" fill={`url(#${patternId})`} />
            <polygon
              points={`0,380 420,${220 + (seed % 40)} 0,${140 + (seed % 30)}`}
              fill="#ffd600"
              fillOpacity="0.12"
            />
            <polygon
              points={`1200,0 780,${80 + (seed % 50)} 1200,${200 + (seed % 40)}`}
              fill="#ffffff"
              fillOpacity="0.06"
            />
          </svg>
        )}

        <div
          className={`absolute inset-0 ${
            hasImage
              ? "bg-ink-950/60"
              : "bg-gradient-to-t from-ink-950/80 via-ink-950/25 to-transparent"
          }`}
        />

        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-8 md:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-3xl">
            <span className="inline-block rounded-full border border-brand-400/80 bg-ink-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400 backdrop-blur-sm">
              {label}
            </span>
            <h1 className="mt-3 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
              {title}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
