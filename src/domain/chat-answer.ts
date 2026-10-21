import { z } from "zod";
import { isUnsafeChatAnswer } from "./chat-policy.js";
import type { retrieveContext } from "./retrieval.js";

const paragraphSchema = z
  .object({
    text: z.string().trim().min(10).max(1200),
    index: z.number().int().nonnegative(),
    quote: z.string().trim().min(20).max(1500),
  })
  .strict();
const answerSchema = z
  .object({
    status: z.enum(["answered", "insufficient_evidence", "out_of_scope"]),
    paragraphs: z.array(paragraphSchema).max(3),
  })
  .strict();

const canonical = (text: string) =>
  text.normalize("NFC").replace(/\s+/g, " ").trim();

function vocabulary(text: string): string[] {
  const common = new Set(
    "para como sobre esta este estos estas porque segun noticia reporte trata puede pueden donde cuando forma desde entre tambien solo informacion explica".split(
      " ",
    ),
  );
  return [
    ...new Set(
      (
        text
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()
          .match(/[\p{L}\p{N}]+/gu) ?? []
      )
        .filter((word) => word.length >= 4 && !common.has(word))
        .map((word) => word.replace(/s$/, "").slice(0, 7)),
    ),
  ];
}

// An additional heuristic, not a proof of semantic entailment: reject unrelated
// prose or new numeric claims even when the model supplied a real quote.
function hasEvidenceSupport(text: string, evidence: string): boolean {
  const numbers = text.match(/\b\d+(?:[.,]\d+)?\b/g) ?? [];
  const evidenceNumbers = new Set(evidence.match(/\b\d+(?:[.,]\d+)?\b/g) ?? []);
  if (numbers.some((number) => !evidenceNumbers.has(number))) return false;
  const words = vocabulary(text),
    known = new Set(vocabulary(evidence));
  return (
    words.length > 0 &&
    words.filter((word) => known.has(word)).length / words.length >= 0.35
  );
}

// The model never supplies URLs or source metadata. Quotes must be present in
// the bounded evidence actually sent; invalid output falls back to excerpts.
export function parseGroundedAnswer(
  raw: string,
  context: ReturnType<typeof retrieveContext>,
) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = answerSchema.safeParse(decoded);
  if (!parsed.success) return undefined;
  const { status, paragraphs } = parsed.data;
  if (status !== "answered") {
    return paragraphs.length === 0
      ? {
          text: "",
          articleIds: [],
          refused: status === "out_of_scope",
          generated: false,
        }
      : undefined;
  }
  if (
    !paragraphs.length ||
    paragraphs.some((part) => {
      const report = context[part.index];
      return (
        !report ||
        isUnsafeChatAnswer(part.text) ||
        isUnsafeChatAnswer(part.quote) ||
        !hasEvidenceSupport(
          part.text,
          `${report.title} ${report.excerpt} ${report.body}`,
        ) ||
        ![report.excerpt, report.body].some((text) =>
          canonical(text).includes(canonical(part.quote)),
        )
      );
    })
  )
    return undefined;
  return {
    text: paragraphs.map((part) => part.text).join("\n\n"),
    articleIds: [
      ...new Set(paragraphs.map((part) => context[part.index]!.articleId)),
    ],
    generated: true,
    refused: false,
  };
}
