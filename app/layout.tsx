import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "lernymart — Pipeline SEO (prototipo)",
    template: "%s | lernymart SEO",
  },
  description:
    "Entorno de prueba del pipeline de generación de artículos SEO para laboratorios clínicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${display.variable} ${sans.variable} font-sans antialiased`}
      >
        <header className="border-b border-brand-200/60 bg-white/60 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold tracking-tight text-brand-800 group-hover:text-brand-700">
                lernymart
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-ink-400">
                SEO lab
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-ink-600">
              <Link href="/blog" className="hover:text-brand-700 transition-colors">
                Blog
              </Link>
              <Link
                href="/admin"
                className="rounded-md bg-brand-700 px-3 py-1.5 text-white hover:bg-brand-600 transition-colors"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-20 border-t border-brand-200/50 py-8 text-center text-sm text-ink-400">
          Prototipo interno · Pipeline SEO lernymart · No es el sitio de producción
        </footer>
      </body>
    </html>
  );
}
