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
  finish_reason?: string | null;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

export interface CallOpenRouterOptions {
  model?: string;
  maxTokens?: number;
}

export async function callOpenRouter<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  modelOrOptions: string | CallOpenRouterOptions = DEFAULT_MODEL
): Promise<T> {
  const options: CallOpenRouterOptions =
    typeof modelOrOptions === "string"
      ? { model: modelOrOptions }
      : modelOrOptions;
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 4096;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new OpenRouterError(
      "Falta OPENROUTER_API_KEY en el entorno (Vercel Environment Variables o .env.local)."
    );
    console.error("[openrouter] missing API key");
    throw err;
  }

  console.info("[openrouter] request", {
    model,
    maxTokens,
    systemChars: systemPrompt.length,
    userChars: userPrompt.length,
    keyPresent: true,
  });

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
        max_tokens: maxTokens,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[openrouter] network error", message);
    throw new OpenRouterError(`Error de red al llamar OpenRouter: ${message}`);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    console.error("[openrouter] HTTP error", {
      status: response.status,
      body: rawBody.slice(0, 2000),
    });
    throw new OpenRouterError(
      `OpenRouter respondió ${response.status}: ${rawBody.slice(0, 500)}`,
      response.status,
      rawBody
    );
  }

  let parsed: OpenRouterResponse;
  try {
    parsed = JSON.parse(rawBody) as OpenRouterResponse;
  } catch {
    console.error("[openrouter] invalid envelope JSON", rawBody.slice(0, 2000));
    throw new OpenRouterError(
      "Respuesta de OpenRouter no es JSON válido",
      response.status,
      rawBody
    );
  }

  if (parsed.error?.message) {
    console.error("[openrouter] API error field", parsed.error.message);
    throw new OpenRouterError(parsed.error.message, response.status, rawBody);
  }

  const choice = parsed.choices?.[0];
  const content = choice?.message?.content;
  const finishReason = choice?.finish_reason ?? null;

  if (!content || typeof content !== "string") {
    console.error(
      "[openrouter] empty content",
      JSON.stringify(parsed).slice(0, 2000)
    );
    throw new OpenRouterError(
      "OpenRouter no devolvió contenido en choices[0].message.content",
      response.status,
      rawBody
    );
  }

  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (finishReason === "length") {
    console.error("[openrouter] truncated by max_tokens", {
      contentLength: cleaned.length,
      maxTokens,
      preview: cleaned.slice(0, 500),
    });
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("[openrouter] model content not JSON", {
      status: response.status,
      finishReason,
      contentPreview: cleaned.slice(0, 2000),
      contentLength: cleaned.length,
    });
    throw new OpenRouterError(
      finishReason === "length"
        ? `OpenRouter truncó la respuesta (finish_reason=length, len=${cleaned.length}, max_tokens=${maxTokens}). El JSON del artículo quedó incompleto.`
        : `El contenido del modelo no es JSON parseable (len=${cleaned.length}, finish_reason=${finishReason ?? "unknown"}).`,
      response.status,
      cleaned.slice(0, 1000)
    );
  }
}
