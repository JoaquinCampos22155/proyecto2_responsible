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

const imageSearchStopWords = new Set(
  [
    "a about al an and anuncia anuncian as at by comienza comienzan con de del desde el en entre esta este for from in inicia inician is la las los mas new nuevo nueva nuevos nuevas of on or para por presenta presentan proyecto realiza realizan se sobre su sus the to tras un una with y",
    "prueba prueban instala instalan",
  ]
    .join(" ")
    .split(" "),
);

const topicSearchTerms: Record<string, string> = {
  climate: "clima",
  weather: "clima",
  education: "educación",
  health: "salud",
  science: "ciencia",
  energy: "energía",
  transport: "transporte",
  culture: "cultura",
  community: "comunidad",
  environment: "ambiente",
  technology: "tecnología",
  economy: "economía",
  sports: "deportes",
  politics: "política",
  politica: "política",
  government: "gobierno",
};

function normalizeSearchTerm(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

function searchTerms(text: string): string[] {
  return (text.toLocaleLowerCase("es").match(/\p{L}{3,}/gu) ?? []).filter(
    (term) => !imageSearchStopWords.has(normalizeSearchTerm(term)),
  );
}

function uniqueSearchTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = normalizeSearchTerm(term);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("locale", "es-ES");
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
  article: Pick<Article, "title" | "summary" | "body" | "topics" | "countries">,
): string {
  const title = article.title.replace(/^\s*\[DEMO\]\s*/i, "");
  const titleTerms = searchTerms(title).slice(0, 5);
  const summaryTerms = searchTerms(article.summary).slice(0, 6);
  const bodyTerms = searchTerms(article.body.slice(0, 800)).slice(0, 4);
  const countryNames = new Intl.DisplayNames(["es"], { type: "region" });
  const locations = article.countries.flatMap((code) => {
    const name = countryNames.of(code.toUpperCase());
    return name && name.toUpperCase() !== code.toUpperCase()
      ? searchTerms(name)
      : [];
  });
  const topicFallback = uniqueSearchTerms(
    article.topics.flatMap((topic) => {
      const term = topicSearchTerms[normalizeSearchTerm(topic)];
      return term ? [term] : [];
    }),
  );
  const contentTerms = uniqueSearchTerms([...titleTerms, ...summaryTerms]);
  const candidates = [
    ...titleTerms,
    ...summaryTerms.slice(0, 4),
    ...(contentTerms.length < 4 ? topicFallback : []),
    ...locations,
    ...summaryTerms.slice(4),
    ...bodyTerms,
    ...topicFallback,
  ];
  const selected: string[] = [];
  for (const candidate of uniqueSearchTerms(candidates)) {
    if (selected.length >= 10) break;
    const next = [...selected, candidate].join(" ");
    if (next.length <= 100) selected.push(candidate);
  }
  return selected.join(" ") || title.trim().slice(0, 100);
}
