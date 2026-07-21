const BASE_URL = "https://gen.pollinations.ai";
/** Modelo barato / free-friendly según catálogo Pollinations */
const DEFAULT_MODEL = "sana";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2500;

export class PollinationsError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string
  ) {
    super(message);
    this.name = "PollinationsError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  return (
    process.env.POLLINATIONS_API_KEY?.trim() ||
    process.env.POLLINATIONS_KEY?.trim() ||
    ""
  );
}

function getModel(): string {
  return process.env.POLLINATIONS_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function explainStatus(status: number, body: string): string {
  if (status === 401) {
    return "API key inválida o mal configurada (401). En Vercel el nombre debe ser exactamente POLLINATIONS_API_KEY y hay que Redeploy.";
  }
  if (status === 402) {
    return "Sin saldo de Pollen en Pollinations (402). Revisa balance en https://enter.pollinations.ai";
  }
  if (status === 403) {
    return "La API key no tiene permiso para generar imágenes (403).";
  }
  return `Pollinations respondió ${status}: ${body.slice(0, 300)}`;
}

async function bufferFromResponse(response: Response): Promise<Buffer> {
  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (contentType.includes("application/json") || buffer[0] === 0x7b /* { */) {
    const text = buffer.toString("utf8");
    // OpenAI-compatible: { data: [{ b64_json | url }] }
    try {
      const json = JSON.parse(text) as {
        data?: Array<{ b64_json?: string; url?: string }>;
        error?: { message?: string };
      };
      if (json.error?.message) {
        throw new PollinationsError(json.error.message, response.status, text);
      }
      const item = json.data?.[0];
      if (item?.b64_json) {
        return Buffer.from(item.b64_json, "base64");
      }
      if (item?.url) {
        const imgRes = await fetch(item.url);
        if (!imgRes.ok) {
          throw new PollinationsError(
            `No se pudo descargar la imagen de Pollinations (${imgRes.status})`,
            imgRes.status
          );
        }
        return Buffer.from(await imgRes.arrayBuffer());
      }
    } catch (err) {
      if (err instanceof PollinationsError) throw err;
      throw new PollinationsError(
        `Pollinations devolvió JSON inesperado: ${text.slice(0, 400)}`,
        response.status,
        text
      );
    }
    throw new PollinationsError(
      `Pollinations no devolvió imagen usable: ${text.slice(0, 400)}`,
      response.status,
      text
    );
  }

  if (buffer.length < 500) {
    throw new PollinationsError(
      "Pollinations devolvió una imagen vacía o inválida.",
      response.status
    );
  }
  return buffer;
}

/** POST OpenAI-compatible — evita URLs enormes del prompt. */
async function generateViaPost(
  apiKey: string,
  model: string,
  prompt: string
): Promise<Buffer> {
  const response = await fetch(`${BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1280x720",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PollinationsError(
      explainStatus(response.status, body),
      response.status,
      body
    );
  }

  return bufferFromResponse(response);
}

/** GET corto — fallback si el POST no está disponible. */
async function generateViaGet(
  apiKey: string,
  model: string,
  prompt: string
): Promise<Buffer> {
  // Prompt corto para no romper límites de URL
  const shortPrompt = prompt.slice(0, 280);
  const url =
    `${BASE_URL}/image/${encodeURIComponent(shortPrompt)}` +
    `?model=${encodeURIComponent(model)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/jpeg,image/png,application/json,*/*",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PollinationsError(
      explainStatus(response.status, body),
      response.status,
      body
    );
  }

  return bufferFromResponse(response);
}

/**
 * Genera imagen con Pollinations.
 * Key: POLLINATIONS_API_KEY (sk_...) en https://enter.pollinations.ai/keys
 */
export async function generateArticleImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new PollinationsError(
      "Falta POLLINATIONS_API_KEY en Vercel (nombre exacto). Crea sk_ en https://enter.pollinations.ai/keys y haz Redeploy."
    );
  }
  if (!apiKey.startsWith("sk_") && !apiKey.startsWith("pk_")) {
    console.warn(
      "[pollinations] la key no empieza con sk_/pk_; puede ser inválida"
    );
  }

  const model = getModel();
  let lastError: PollinationsError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.info("[pollinations] image request", {
      model,
      attempt,
      promptChars: prompt.length,
      keyPrefix: apiKey.slice(0, 6),
    });

    try {
      const buffer =
        attempt === 1
          ? await generateViaPost(apiKey, model, prompt)
          : await generateViaGet(apiKey, model, prompt);

      console.info("[pollinations] image ok", {
        bytes: buffer.length,
        model,
        via: attempt === 1 ? "post" : "get",
      });
      return buffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[pollinations] attempt failed", { attempt, message });
      lastError =
        err instanceof PollinationsError
          ? err
          : new PollinationsError(message);

      const status = lastError.status ?? 0;
      const retryable =
        status === 429 || status === 503 || status >= 500 || status === 0;
      if (attempt < MAX_ATTEMPTS && retryable) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      // Si POST falló por 404/405, probar GET en el siguiente intento
      if (attempt === 1 && (status === 404 || status === 405 || status === 400)) {
        continue;
      }
      throw lastError;
    }
  }

  throw (
    lastError ??
    new PollinationsError("No se pudo generar la imagen con Pollinations.")
  );
}
