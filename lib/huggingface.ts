import { InferenceClient } from "@huggingface/inference";

/** Modelo razonable en tier gratuito (Serverless / hf-inference). */
const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 6000;

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

function getApiKey(): string {
  return (
    process.env.HUGGINGFACE_API_KEY?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    ""
  );
}

function getModel(): string {
  return process.env.HUGGINGFACE_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function getProvider(): "auto" | "fal-ai" | "replicate" | "hf-inference" {
  // Por defecto hf-inference = ruta serverless gratis (sin tarjeta).
  const raw = (process.env.HUGGINGFACE_PROVIDER ?? "hf-inference")
    .trim()
    .toLowerCase();
  if (
    raw === "fal-ai" ||
    raw === "replicate" ||
    raw === "hf-inference" ||
    raw === "auto"
  ) {
    return raw;
  }
  return "hf-inference";
}

function isRetryableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("loading") ||
    m.includes("503") ||
    m.includes("timeout") ||
    m.includes("temporarily") ||
    m.includes("overloaded") ||
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("estimated_time")
  );
}

async function blobToBuffer(value: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value && typeof value === "object" && "arrayBuffer" in value) {
    const ab = await (value as Blob).arrayBuffer();
    return Buffer.from(ab);
  }
  throw new HuggingFaceError(
    "Hugging Face no devolvió un Blob/Buffer de imagen reconocible."
  );
}

const NEGATIVE_PROMPT =
  "text, letters, words, typography, caption, title, subtitle, watermark, logo, signature, writing, alphabet, numbers, signage, UI text, readable text, poster text, book cover text";

/**
 * Genera imagen con Hugging Face (tier gratuito vía hf-inference / Serverless).
 * Default: Stable Diffusion XL (más compatible sin billing que FLUX providers).
 */
export async function generateArticleImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new HuggingFaceError(
      "Falta HUGGINGFACE_API_KEY en Vercel/.env.local."
    );
  }

  const model = getModel();
  const provider = getProvider();
  const client = new InferenceClient(apiKey);

  let lastError: HuggingFaceError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.info("[huggingface] textToImage", {
      model,
      provider,
      attempt,
      promptPreview: prompt.slice(0, 200),
      keyPresent: true,
    });

    try {
      const result = await client.textToImage({
        model,
        provider,
        inputs: prompt,
        parameters: {
          negative_prompt: NEGATIVE_PROMPT,
          guidance_scale: 7,
          num_inference_steps: 20,
        },
      });

      const buffer = await blobToBuffer(result);
      if (buffer.length < 100) {
        throw new HuggingFaceError(
          "Hugging Face devolvió una imagen vacía o inválida."
        );
      }

      console.info("[huggingface] image ok", { bytes: buffer.length, model });
      return buffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[huggingface] textToImage failed", {
        attempt,
        message,
      });

      lastError = new HuggingFaceError(
        `Hugging Face textToImage falló: ${message}`,
        undefined,
        message
      );

      // Fallback HTTP serverless si el SDK falla (cold start / provider)
      if (attempt === 2) {
        try {
          const viaHttp = await generateViaClassicInferenceApi(
            apiKey,
            model,
            prompt
          );
          console.info("[huggingface] classic API ok", {
            bytes: viaHttp.length,
          });
          return viaHttp;
        } catch (httpErr) {
          const httpMsg =
            httpErr instanceof Error ? httpErr.message : String(httpErr);
          console.error("[huggingface] classic API failed", httpMsg);
          lastError = new HuggingFaceError(httpMsg);
        }
      }

      if (attempt < MAX_ATTEMPTS && isRetryableMessage(message)) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }

  throw (
    lastError ??
    new HuggingFaceError("No se pudo generar la imagen con Hugging Face.")
  );
}

/** Endpoint serverless clásico (suele funcionar en cuenta free sin tarjeta). */
async function generateViaClassicInferenceApi(
  apiKey: string,
  model: string,
  prompt: string
): Promise<Buffer> {
  const url = `https://api-inference.huggingface.co/models/${model}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: NEGATIVE_PROMPT,
          guidance_scale: 7,
          num_inference_steps: 20,
        },
      }),
    });

    if (response.status === 503) {
      const body = await response.text();
      console.warn("[huggingface] classic 503 loading", body.slice(0, 300));
      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new HuggingFaceError(
        `API Inference respondió ${response.status}: ${body.slice(0, 400)}`,
        response.status,
        body
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (contentType.includes("application/json")) {
      throw new HuggingFaceError(
        `API Inference no devolvió imagen: ${buffer.toString("utf8").slice(0, 400)}`
      );
    }
    if (buffer.length < 100) {
      throw new HuggingFaceError("Imagen vacía desde API Inference.");
    }
    return buffer;
  }

  throw new HuggingFaceError(
    "Modelo aún cargando en Hugging Face (503). Reintenta en unos segundos."
  );
}
