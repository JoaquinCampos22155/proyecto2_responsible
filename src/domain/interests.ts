import type { EventType } from "./types.js";
export function updateInterests(
  weights: Record<string, number>,
  type: EventType,
  topics: string[],
  durationSeconds?: number,
): Record<string, number> {
  const increment =
    type === "share"
      ? 2
      : type === "reading_time" && (durationSeconds ?? 0) >= 30
        ? 1.5
        : type === "article_open"
          ? 0.5
          : type === "topic_interaction"
            ? 0.75
            : 0;
  if (increment === 0) return { ...weights };
  const next = { ...weights };
  for (const topic of new Set(
    topics.map((value) => value.trim().toLowerCase()).filter(Boolean),
  )) {
    next[topic] = Math.min(
      10,
      Math.round(((next[topic] ?? 0) + increment) * 100) / 100,
    );
  }
  return next;
}
