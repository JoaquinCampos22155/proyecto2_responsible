import type { EventInput } from "../types/domain";
export function createEventTracker(
  send: (event: EventInput) => Promise<unknown>,
) {
  const sent = new Set<string>();
  return {
    async once(type: "impression" | "article_open", articleId: string) {
      const key = `${type}:${articleId}`;
      if (sent.has(key)) return;
      sent.add(key);
      try {
        await send({ type, articleId });
      } catch {
        sent.delete(key);
      }
    },
    async reading(articleId: string, milliseconds: number) {
      const durationSeconds = Math.min(
        3600,
        Math.max(0, Math.floor(milliseconds / 1000)),
      );
      if (durationSeconds < 5) return;
      try {
        await send({ type: "reading_time", articleId, durationSeconds });
      } catch {
        /* Optional telemetry must not interrupt reading. */
      }
    },
  };
}
