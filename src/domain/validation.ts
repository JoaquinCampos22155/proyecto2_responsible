import { z } from "zod";
const httpUrl = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "HTTP(S) URL required");
const topic = z.string().trim().toLowerCase().min(2).max(40);
const country = z.string().regex(/^[A-Z]{2}$/);
export const locationInput = z
  .object({
    country,
    region: z
      .string()
      .regex(/^[A-Z]{2}-[A-Z0-9]{1,8}$/)
      .optional(),
  })
  .strict();
export const sourceInput = z
  .object({
    name: z.string().trim().min(2).max(200),
    url: httpUrl,
    publisher: z.string().trim().min(2).max(120),
    retrievedAt: z.iso.datetime().optional(),
    sourceType: z.enum([
      "news",
      "wire",
      "official",
      "report",
      "eyewitness",
      "social",
      "other",
    ]),
    stance: z.enum(["supports", "disputes", "context"]),
    originSource: z.string().trim().min(2).max(120).optional(),
    sourceGroup: z.string().trim().min(2).max(120).optional(),
    credibilityNote: z.string().max(500).optional(),
  })
  .strict();
export const imageInput = z
  .object({
    url: httpUrl,
    provider: z.string().min(2).max(80),
    originalUrl: httpUrl.nullable(),
    sourcePageUrl: httpUrl.optional(),
    license: z.string().max(200).nullable(),
    attribution: z.string().max(200).nullable(),
    generatedByAI: z.boolean(),
    alteredByAI: z.boolean(),
    retrievedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (image) => !image.generatedByAI || image.provider.length > 0,
    "AI image provider required",
  );
export const draftInput = z
  .object({
    title: z.string().trim().min(5).max(250),
    body: z.string().trim().min(10).max(20000),
    summary: z.string().trim().max(1000).optional(),
    author: z.string().trim().max(120).optional(),
    publisher: z.string().trim().max(120).optional(),
    canonicalUrl: httpUrl,
    scope: z.enum(["local", "national", "international"]),
    countries: z.array(country).min(1).max(10),
    regions: z.array(z.string().regex(/^[A-Z]{2}-[A-Z0-9]{1,8}$/)).max(20),
    topics: z.array(topic).min(1).max(12),
    editorialPriority: z.enum(["normal", "high"]),
    developing: z.boolean().optional(),
    aiDisclosure: z
      .object({ assisted: z.boolean(), note: z.string().max(500).nullable() })
      .strict()
      .optional(),
  })
  .strict();
export const eventInput = z
  .object({
    type: z.enum([
      "impression",
      "article_open",
      "reading_time",
      "share",
      "topic_interaction",
    ]),
    articleId: z.string().min(1).max(120),
    durationSeconds: z.number().int().min(0).max(3600).optional(),
    topic: topic.optional(),
  })
  .strict()
  .refine(
    (event) =>
      event.type !== "reading_time" || event.durationSeconds !== undefined,
    "durationSeconds required",
  );
