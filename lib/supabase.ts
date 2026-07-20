import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function cleanEnv(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function normalizeSupabaseUrl(raw: string): string {
  let url = cleanEnv(raw).replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}

export function getSupabase(): SupabaseClient {
  const url = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  );
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL en Vercel (nombre exacto). Valor: https://TU-REF.supabase.co"
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en Vercel (nombre exacto). Usa la clave service_role, no la anon public."
    );
  }

  if (
    !url.startsWith("https://") ||
    !url.includes(".supabase.co") ||
    url.includes("supabase.com/dashboard")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL inválida. Debe ser https://xxxxx.supabase.co sin /rest/v1 ni otros paths."
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
