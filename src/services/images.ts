import type { ImageRecord } from "../domain/types.js";
import { AppError } from "./errors.js";
export interface ImageProvider {
  search(keywords: string, now: string): Promise<ImageRecord[]>;
}
export interface GeneratedImageProvider {
  generate(keywords: string, now: string): Promise<ImageRecord>;
}
export class MockStockImageProvider implements ImageProvider {
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
  ) {}
  async search(keywords: string): Promise<ImageRecord[]> {
    if (keywords.trim().length < 2 || keywords.length > 100)
      throw new AppError(
        "INVALID_INPUT",
        "Keywords must contain 2–100 characters",
        400,
      );
    return this.provider.search(keywords, this.now());
  }
}
