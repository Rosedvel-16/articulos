/**
 * Cliente OpenRouter — reemplaza los nodos LLM del flujo n8n.
 * Usa response_format json_object para forzar salida JSON parseable.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

interface OpenRouterChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

/**
 * Llama a OpenRouter Chat Completions y devuelve el JSON parseado del mensaje.
 */
export async function callOpenRouter<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "Falta OPENROUTER_API_KEY. Copia .env.local.example a .env.local y configura la clave."
    );
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "lernymart-seo-pipeline",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OpenRouterError(`Error de red al llamar OpenRouter: ${message}`);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    throw new OpenRouterError(
      `OpenRouter respondió ${response.status}`,
      response.status,
      rawBody
    );
  }

  let parsed: OpenRouterResponse;
  try {
    parsed = JSON.parse(rawBody) as OpenRouterResponse;
  } catch {
    throw new OpenRouterError(
      "Respuesta de OpenRouter no es JSON válido",
      response.status,
      rawBody
    );
  }

  if (parsed.error?.message) {
    throw new OpenRouterError(parsed.error.message, response.status, rawBody);
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new OpenRouterError(
      "OpenRouter no devolvió contenido en choices[0].message.content",
      response.status,
      rawBody
    );
  }

  // Algunos modelos envuelven el JSON en fences markdown; los limpiamos.
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new OpenRouterError(
      "El contenido del modelo no es JSON parseable",
      response.status,
      cleaned
    );
  }
}
