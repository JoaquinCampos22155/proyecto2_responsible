import type { Article, ImageRecord } from "../domain/types.js";
import { AppError } from "./errors.js";
import type { UsageService } from "./usage.js";
export interface ImageProvider {
  readonly mode?: string;
  search(keywords: string, now: string): Promise<ImageRecord[]>;
}
export interface GeneratedImageProvider {
  generate(keywords: string, now: string): Promise<ImageRecord>;
}
export class MockStockImageProvider implements ImageProvider {
  readonly mode = "mock-stock";
  async search(_keywords: string, now: string): Promise<ImageRecord[]> {
    return [
      {
        url: "https://placehold.co/1200x800/png?text=DEMO+IMAGE",
        provider: "mock-stock",
        originalUrl: "https://placehold.co/",
        license: "Demo placeholder; replace before production",
        attribution: "Placehold.co",
        generatedByAI: false,
        alteredByAI: false,
        retrievedAt: now,
      },
    ];
  }
}
export class PexelsImageProvider implements ImageProvider {
  readonly mode = "pexels";
  constructor(
    private apiKey: string,
    private fetcher: typeof fetch = fetch,
  ) {}
  async search(keywords: string, now: string): Promise<ImageRecord[]> {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", keywords);
    url.searchParams.set("per_page", "5");
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { Authorization: this.apiKey },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new AppError("IMAGE_PROVIDER_ERROR", "Pexels request failed", 502);
    }
    if (!response.ok)
      throw new AppError("IMAGE_PROVIDER_ERROR", "Pexels request failed", 502);
    const data = (await response.json()) as {
      photos?: Array<{
        url?: string;
        photographer?: string;
        src?: { original?: string; landscape?: string };
      }>;
    };
    if (!Array.isArray(data.photos))
      throw new AppError(
        "IMAGE_PROVIDER_ERROR",
        "Pexels returned an invalid response",
        502,
      );
    return data.photos
      .filter(
        (photo) =>
          photo.url &&
          photo.src?.original &&
          photo.src?.landscape &&
          photo.photographer,
      )
      .map((photo) => ({
        url: photo.src!.landscape!,
        provider: "pexels",
        originalUrl: photo.src!.original!,
        sourcePageUrl: photo.url!,
        license: "Pexels License",
        attribution: `Photo by ${photo.photographer} on Pexels`,
        generatedByAI: false,
        alteredByAI: false,
        retrievedAt: now,
      }));
  }
}
export class ImageService {
  constructor(
    private provider: ImageProvider,
    private now: () => string,
    private usage?: UsageService,
  ) {}
  async search(keywords: string, actorUid?: string): Promise<ImageRecord[]> {
    if (keywords.trim().length < 2 || keywords.length > 100)
      throw new AppError(
        "INVALID_INPUT",
        "Keywords must contain 2–100 characters",
        400,
      );
    const images = await this.provider.search(keywords, this.now());
    await this.usage?.record({
      provider: this.provider.mode ?? images[0]?.provider ?? "stock",
      model: "stock-search",
      feature: "image",
      estimatedCostUsd: 0,
      ...(actorUid ? { actorUid } : {}),
      correlationId: this.now(),
    });
    return images;
  }
  async forArticle(
    article: Article,
    actorUid: string,
  ): Promise<ImageRecord | null> {
    return (await this.search(stockQuery(article), actorUid))[0] ?? null;
  }
}

// Neutral stock subjects illustrate a topic, never reconstruct the reported event.
export function stockQuery(
  article: Pick<Article, "title" | "topics" | "countries">,
): string {
  const text = article.title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (
    article.topics.some((topic) =>
      /^(politics|politica|government)$/.test(topic),
    )
  )
    return article.countries.includes("US") ||
      /ee\.?\s?uu|estados unidos|trump|washington/.test(text)
      ? "United States Capitol building"
      : "government parliament building";
  const subjects: Record<string, string> = {
    climate: "weather clouds",
    weather: "weather clouds",
    education: "school classroom",
    health: "hospital healthcare",
    science: "science laboratory",
    energy: "solar panels",
    transport: "public transport",
    culture: "museum art",
    community: "community public park",
    environment: "nature forest",
    technology: "technology computer",
    economy: "business finance",
    sports: "sports stadium",
  };
  return (
    article.topics.map((topic) => subjects[topic]).find(Boolean) ??
    article.title
      .replace(/^\s*\[DEMO\]\s*/i, "")
      .trim()
      .slice(0, 100)
  );
}
