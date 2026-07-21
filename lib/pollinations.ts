const BASE_URL = "https://gen.pollinations.ai";
const DEFAULT_MODEL = "flux";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

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

/**
 * Genera imagen con Pollinations (GET /image/{prompt}).
 * Auth: Authorization Bearer sk_... (enter.pollinations.ai/keys)
 */
export async function generateArticleImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new PollinationsError(
      "Falta POLLINATIONS_API_KEY en Vercel/.env.local (créala en https://enter.pollinations.ai/keys)."
    );
  }

  const model = getModel();
  const encoded = encodeURIComponent(prompt.slice(0, 800));
  const url =
    `${BASE_URL}/image/${encoded}` +
    `?model=${encodeURIComponent(model)}` +
    `&width=1280&height=720&nologo=true`;

  let lastError: PollinationsError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.info("[pollinations] image request", {
      model,
      attempt,
      promptPreview: prompt.slice(0, 160),
      keyPresent: true,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/jpeg,image/png,*/*",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new PollinationsError(
        `Error de red al llamar Pollinations: ${message}`
      );
    }

    if (!response.ok) {
      const body = await response.text();
      console.error("[pollinations] HTTP error", {
        status: response.status,
        body: body.slice(0, 800),
      });
      lastError = new PollinationsError(
        `Pollinations respondió ${response.status}: ${body.slice(0, 400)}`,
        response.status,
        body
      );

      if (
        attempt < MAX_ATTEMPTS &&
        (response.status === 429 ||
          response.status === 503 ||
          response.status >= 500)
      ) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("application/json")) {
      const text = buffer.toString("utf8");
      throw new PollinationsError(
        `Pollinations no devolvió imagen: ${text.slice(0, 400)}`,
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

    console.info("[pollinations] image ok", {
      bytes: buffer.length,
      contentType,
      model,
    });
    return buffer;
  }

  throw (
    lastError ??
    new PollinationsError("No se pudo generar la imagen con Pollinations.")
  );
}
