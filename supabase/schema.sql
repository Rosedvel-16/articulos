-- Schema aditivo del pipeline SEO (Lernymart).
-- Seguro de re-ejecutar. No borra datos.

-- Columna de imagen de cabecera (Pollinations → Supabase Storage)
ALTER TABLE IF EXISTS articles
  ADD COLUMN IF NOT EXISTS imagen_url text;

-- ---------------------------------------------------------------------------
-- BUCKET DE STORAGE (manual en Dashboard; no se crea por SQL normal)
-- ---------------------------------------------------------------------------
-- 1. Supabase → Storage → New bucket
-- 2. Name: article-images
-- 3. Public bucket: YES
-- 4. (Opcional) File size limit: 5 MB
--
-- El código en lib/pipeline/attachArticleImage.ts intenta crear el bucket
-- automáticamente con la service_role si aún no existe.
-- URL pública típica:
--   {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/article-images/{slug}.png
