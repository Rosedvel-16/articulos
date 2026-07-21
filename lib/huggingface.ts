import { InferenceClient } from "@huggingface/inference";

const DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

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
  const raw = (process.env.HUGGINGFACE_PROVIDER ?? "auto").trim().toLowerCase();
  if (
    raw === "fal-ai" ||
    raw === "replicate" ||
    raw === "hf-inference" ||
    raw === "auto"
  ) {
    return raw;
  }
  return "auto";
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
    m.includes("429")
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

/**
 * Genera una imagen con Hugging Face Inference Providers (API actual).
 * Default: FLUX.1-schnell con provider=auto.
 */
export async function generateArticleImage(prompt: string): Promise<Buffer> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new HuggingFaceError(
      "Falta HUGGINGFACE_API_KEY en Vercel/.env.local (token con permiso Inference Providers)."
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
      promptPreview: prompt.slice(0, 160),
      keyPresent: true,
    });

    try {
      const result = await client.textToImage({
        model,
        provider,
        inputs: prompt,
        parameters: {
          num_inference_steps: 4,
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
        err,
      });

      lastError = new HuggingFaceError(
        `Hugging Face textToImage falló: ${message}`,
        undefined,
        message
      );

      if (attempt < MAX_ATTEMPTS && isRetryableMessage(message)) {
        await sleep(RETRY_DELAY_MS * attempt);
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
