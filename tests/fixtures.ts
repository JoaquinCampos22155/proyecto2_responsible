import type { Article, SourceRecord } from "../src/domain/types.js";

export const source = (
  publisher: string,
  stance: SourceRecord["stance"] = "supports",
): SourceRecord => ({
  name: `${publisher} report`,
  url: `https://${publisher}.example/report`,
  publisher,
  retrievedAt: "2026-09-25T12:00:00.000Z",
  sourceType: "report",
  stance,
});

export const article = (
  id: string,
  overrides: Partial<Article> = {},
): Article => ({
  id,
  title: `Demo ${id}`,
  body: `Synthetic classroom story about ${id}.`,
  summary: `Synthetic ${id}`,
  author: "Demo desk",
  publisher: "Demo News",
  canonicalUrl: `https://demo.example/${id}`,
  publishedAt: "2026-09-25T12:00:00.000Z",
  createdAt: "2026-09-25T11:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  scope: "national",
  countries: ["GT"],
  regions: [],
  topics: ["technology"],
  editorialPriority: "normal",
  verificationStatus: "single_source",
  sources: [source("demo")],
  image: null,
  aiDisclosure: { assisted: false, note: null },
  status: "published",
  humanReview: {
    reviewedBy: "admin-1",
    reviewedAt: "2026-09-25T12:00:00.000Z",
  },
  ...overrides,
});
