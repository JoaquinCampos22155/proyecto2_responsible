import type { Article } from "./types.js";

const GUATEMALA_TIME_ZONE = "America/Guatemala";
const MAX_COUNTRY_STORIES = 10;

type DateParts = { year: number; month: number; day: number };
export type GlobeWeek = {
  start: string;
  end: string;
  startAt: string;
  endAt: string;
};
export type GlobeCountryDigest = {
  count: number;
  items: { article: Article; reasons: string[] }[];
};
export type GlobeDigest = {
  week: Pick<GlobeWeek, "start" | "end">;
  countries: Record<string, GlobeCountryDigest>;
  worldStory: { article: Article; reasons: string[] } | null;
};

function localDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GUATEMALA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
  };
}

function dateKey({ year, month, day }: DateParts) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addCalendarDays(parts: DateParts, offset: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function atGuatemalaMidnight(key: string) {
  // Guatemala remains on UTC-06:00 and does not observe daylight saving time.
  return new Date(`${key}T00:00:00-06:00`).toISOString();
}

export function currentGlobeWeek(now: Date): GlobeWeek {
  const today = localDateParts(now);
  const weekday = new Date(
    Date.UTC(today.year, today.month - 1, today.day),
  ).getUTCDay();
  const start = dateKey(addCalendarDays(today, -weekday));
  const end = dateKey(addCalendarDays(partsFromKey(start), 7));
  return {
    start,
    end,
    startAt: atGuatemalaMidnight(start),
    endAt: atGuatemalaMidnight(end),
  };
}

function partsFromKey(key: string): DateParts {
  const [year = 0, month = 0, day = 0] = key.split("-").map(Number);
  return { year, month, day };
}

function compareEditorialImportance(left: Article, right: Article) {
  const priority =
    Number(right.editorialPriority === "high") -
    Number(left.editorialPriority === "high");
  if (priority) return priority;
  return (
    Date.parse(right.publishedAt ?? "") - Date.parse(left.publishedAt ?? "") ||
    left.id.localeCompare(right.id)
  );
}

export function digestGlobeNews(
  articles: Article[],
  week: GlobeWeek,
): GlobeDigest {
  const start = Date.parse(week.startAt);
  const end = Date.parse(week.endAt);
  const grouped = new Map<string, Article[]>();
  const weeklyArticles: Article[] = [];

  for (const article of articles) {
    if (article.status !== "published" || !article.publishedAt) continue;
    const publishedAt = Date.parse(article.publishedAt);
    if (Number.isNaN(publishedAt) || publishedAt < start || publishedAt >= end)
      continue;
    weeklyArticles.push(article);
    for (const country of new Set(article.countries.map((code) => code.toUpperCase()))) {
      const countryArticles = grouped.get(country) ?? [];
      countryArticles.push(article);
      grouped.set(country, countryArticles);
    }
  }

  const countries = Object.fromEntries(
    [...grouped.entries()].map(([country, stories]) => {
      const ordered = stories.sort(compareEditorialImportance);
      return [
        country,
        {
          count: ordered.length,
          items: ordered.slice(0, MAX_COUNTRY_STORIES).map((article) => ({
            article,
            reasons: [],
          })),
        },
      ];
    }),
  );
  const worldStory = weeklyArticles
    .filter((article) => article.scope === "international")
    .sort(compareEditorialImportance)[0];
  return {
    week: { start: week.start, end: week.end },
    countries,
    worldStory: worldStory ? { article: worldStory, reasons: [] } : null,
  };
}
