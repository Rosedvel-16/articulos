export const ARTICLE_CATEGORIES = [
  { value: "cursos", label: "Cursos" },
  { value: "ebooks", label: "Ebooks" },
  { value: "educacion-online", label: "Educación online" },
  { value: "emprendimiento", label: "Emprendimiento" },
  { value: "marketing-digital", label: "Marketing digital" },
  { value: "negocios", label: "Negocios" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "desarrollo-personal", label: "Desarrollo personal" },
  { value: "diseno", label: "Diseño" },
  { value: "general", label: "General" },
] as const;

export type ArticleCategoryValue =
  (typeof ARTICLE_CATEGORIES)[number]["value"];
