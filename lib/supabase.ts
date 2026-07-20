import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function cleanEnv(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

export function getSupabase(): SupabaseClient {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno (Vercel o .env.local)."
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno (Vercel o .env.local)."
    );
  }

  if (
    !url.startsWith("https://") ||
    !url.includes(".supabase.co") ||
    url.includes("supabase.com/dashboard")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL inválida. Debe ser exactamente la Project URL tipo https://xxxxx.supabase.co (Settings → API), no el link del dashboard ni la connection string de Postgres."
    );
  }

  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}
