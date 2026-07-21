const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 4000;

export class HuggingFaceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string
  ) {
    super(message);
    this.name = "HuggingFaceError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModel(): string {
  return (
    process.env.HUGGINGFACE_IMAGE_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

/**
 * Genera una imagen con Hugging Face Inference API.
 * Retorna el binario (Buffer). Reintenta si el modelo responde 503 (cargando).
 */
export async function generateArticleImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!apiKey) {
    throw new HuggingFaceError(
      "Falta HUGGINGFACE_API_KEY en el entorno (Vercel o .env.local)."
    );
  }

  const model = getModel();
  const url = `https://api-inference.huggingface.co/models/${model}`;

  let lastError: HuggingFaceError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.info("[huggingface] image request", {
      model,
      attempt,
      promptPreview: prompt.slice(0, 160),
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({ inputs: prompt }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HuggingFaceError(
        `Error de red al llamar Hugging Face: ${message}`
      );
    }

    if (response.status === 503) {
      const body = await response.text();
      lastError = new HuggingFaceError(
        `Modelo Hugging Face aún cargando (503). Reintento ${attempt}/${MAX_ATTEMPTS}.`,
        503,
        body
      );
      console.warn("[huggingface] model loading", {
        attempt,
        body: body.slice(0, 500),
      });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }

    if (!response.ok) {
      const body = await response.text();
      console.error("[huggingface] HTTP error", {
        status: response.status,
        body: body.slice(0, 1000),
      });
      throw new HuggingFaceError(
        `Hugging Face respondió ${response.status}: ${body.slice(0, 400)}`,
        response.status,
        body
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("application/json")) {
      const text = buffer.toString("utf8");
      console.error("[huggingface] JSON instead of image", text.slice(0, 1000));
      throw new HuggingFaceError(
        `Hugging Face no devolvió imagen: ${text.slice(0, 400)}`,
        response.status,
        text
      );
    }

    if (buffer.length < 100) {
      throw new HuggingFaceError(
        "Hugging Face devolvió una imagen vacía o inválida.",
        response.status
      );
    }

    console.info("[huggingface] image ok", {
      bytes: buffer.length,
      contentType,
    });
    return buffer;
  }

  throw (
    lastError ??
    new HuggingFaceError("No se pudo generar la imagen con Hugging Face.")
  );
}
