const SERPAPI_URL = "https://serpapi.com/search.json";

export interface TrendTimelinePoint {
  date: string;
  timestamp?: string;
  value: number;
}

export class SerpApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: string
  ) {
    super(message);
    this.name = "SerpApiError";
  }
}

interface SerpApiInterestOverTime {
  timeline_data?: Array<{
    date?: string;
    timestamp?: string;
    values?: Array<{
      query?: string;
      value?: string | number;
      extracted_value?: number;
    }>;
  }>;
}

interface SerpApiResponse {
  error?: string;
  interest_over_time?: SerpApiInterestOverTime;
}

function mapTimeline(
  timelineData: NonNullable<SerpApiInterestOverTime["timeline_data"]>
): TrendTimelinePoint[] {
  return timelineData.map((point) => {
    const extracted = point.values?.[0]?.extracted_value;
    const rawValue = point.values?.[0]?.value;
    let value = 0;

    if (typeof extracted === "number") {
      value = extracted;
    } else if (typeof rawValue === "number") {
      value = rawValue;
    } else if (typeof rawValue === "string") {
      const n = Number.parseInt(rawValue.replace(/[^\d.-]/g, ""), 10);
      value = Number.isFinite(n) ? n : 0;
    }

    return {
      date: point.date ?? point.timestamp ?? "",
      timestamp: point.timestamp,
      value,
    };
  });
}

function isNoResultsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("hasn't returned any results") ||
    m.includes("has not returned any results") ||
    m.includes("no results")
  );
}

async function fetchTrendsOnce(
  keyword: string,
  apiKey: string,
  geo: string | null
): Promise<TrendTimelinePoint[]> {
  const params = new URLSearchParams({
    engine: "google_trends",
    q: keyword,
    hl: "es",
    data_type: "TIMESERIES",
    date: "today 12-m",
    api_key: apiKey,
  });
  if (geo) {
    params.set("geo", geo);
  }

  let response: Response;
  try {
    response = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SerpApiError(`Error de red al llamar SerpApi: ${message}`);
  }

  const rawBody = await response.text();

  if (!response.ok) {
    throw new SerpApiError(
      `SerpApi respondió ${response.status}`,
      response.status,
      rawBody
    );
  }

  let parsed: SerpApiResponse;
  try {
    parsed = JSON.parse(rawBody) as SerpApiResponse;
  } catch {
    throw new SerpApiError(
      "Respuesta de SerpApi no es JSON válido",
      response.status,
      rawBody
    );
  }

  if (parsed.error) {
    if (isNoResultsError(parsed.error)) {
      return [];
    }
    throw new SerpApiError(parsed.error, response.status, rawBody);
  }

  return mapTimeline(parsed.interest_over_time?.timeline_data ?? []);
}

export async function getGoogleTrends(
  keyword: string
): Promise<TrendTimelinePoint[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new SerpApiError(
      "Falta SERPAPI_API_KEY. Configúrala en Vercel o .env.local."
    );
  }

  const peTimeline = await fetchTrendsOnce(keyword, apiKey, "PE");
  if (peTimeline.length > 0 && peTimeline.some((p) => p.value > 0)) {
    return peTimeline;
  }

  const worldTimeline = await fetchTrendsOnce(keyword, apiKey, null);
  if (worldTimeline.length > 0) {
    return worldTimeline;
  }

  return [];
}
