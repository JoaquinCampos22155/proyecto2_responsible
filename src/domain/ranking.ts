import type { Article } from "./types.js";
export function rankFeed(
  articles: Article[],
  profile: {
    simulatedLocation: { country: string; region?: string };
    interestWeights: Record<string, number>;
  },
  now: Date,
  limit: number,
): Array<{ article: Article; reasons: string[] }> {
  const candidates = articles
    .filter((article) => article.status === "published")
    .map((article) => {
      const regionMatch = Boolean(
        profile.simulatedLocation.region &&
        article.regions.includes(profile.simulatedLocation.region),
      );
      const countryMatch = article.countries.includes(
        profile.simulatedLocation.country,
      );
      const matchedTopic = article.topics.reduce<{
        topic: string;
        weight: number;
      } | null>((best, topic) => {
        const weight = profile.interestWeights[topic] ?? 0;
        return weight > (best?.weight ?? 0) ? { topic, weight } : best;
      }, null);
      const ageHours = article.publishedAt
        ? Math.max(
            0,
            (now.getTime() - new Date(article.publishedAt).getTime()) /
              3_600_000,
          )
        : 1000;
      const score =
        (regionMatch ? 5 : countryMatch ? 3 : 0) +
        (matchedTopic?.weight ?? 0) * 0.45 +
        (article.editorialPriority === "high" ? 3 : 0) +
        4 / (1 + ageHours / 24);
      const reasons = [
        ...(regionMatch
          ? ["Relevant to your selected region"]
          : countryMatch
            ? ["Relevant to your selected country"]
            : []),
        ...(matchedTopic
          ? [`Matches your interest in ${matchedTopic.topic}`]
          : []),
        ...(article.editorialPriority === "high"
          ? [
              article.scope === "international"
                ? "High editorial priority: international story"
                : "High editorial priority",
            ]
          : []),
      ];
      return { article, reasons, score };
    })
    .sort(
      (a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id),
    );

  const selected: typeof candidates = [];
  const capacity = Math.max(0, Math.min(limit, 50));
  const add = (item: (typeof candidates)[number] | undefined) => {
    if (
      item &&
      selected.length < capacity &&
      !selected.some((picked) => picked.article.id === item.article.id)
    )
      selected.push(item);
  };
  if (capacity >= 3) {
    add(
      candidates.find(
        (item) =>
          item.article.scope === "local" &&
          item.article.countries.includes(profile.simulatedLocation.country) &&
          (!profile.simulatedLocation.region ||
            item.article.regions.includes(profile.simulatedLocation.region)),
      ),
    );
    add(
      candidates.find(
        (item) =>
          item.article.scope === "national" &&
          item.article.countries.includes(profile.simulatedLocation.country),
      ),
    );
    add(candidates.find((item) => item.article.scope === "international"));
    if (capacity >= 4)
      add(candidates.find((item) => item.article.editorialPriority === "high"));
  }
  while (selected.length < capacity) {
    const remaining = candidates.filter(
      (item) =>
        !selected.some((picked) => picked.article.id === item.article.id),
    );
    if (remaining.length === 0) break;
    const seenTopics = new Set(selected.flatMap((item) => item.article.topics));
    const next = [...remaining].sort(
      (a, b) =>
        b.score +
          (b.article.topics.some((topic) => !seenTopics.has(topic)) ? 1 : 0) -
          (a.score +
            (a.article.topics.some((topic) => !seenTopics.has(topic))
              ? 1
              : 0)) || a.article.id.localeCompare(b.article.id),
    )[0];
    add(next);
  }
  return selected.map(({ article, reasons }) => ({ article, reasons }));
}
