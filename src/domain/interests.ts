import type { EventType } from "./types.js";

export const INTEREST_HALF_LIFE_DAYS = 7;
type InterestProfile = {
  interestWeights: Record<string, number>;
  interestUpdatedAt?: Record<string, string>;
  updatedAt?: string;
  createdAt?: string;
};
function incrementFor(type: EventType, durationSeconds?: number): number {
  return type === "share"
    ? 2
    : type === "reading_time" && (durationSeconds ?? 0) >= 30
      ? 1.5
      : type === "article_open"
        ? 0.5
        : type === "topic_interaction"
          ? 0.75
          : 0;
}
const normalizedTopics = (topics: string[]) => [
  ...new Set(topics.map((value) => value.trim().toLowerCase()).filter(Boolean)),
];

// Legacy profiles have no per-topic dates. Freeze their best available date
// before unrelated events can change the general profile.updatedAt field.
export function interestAnchors(
  profile: InterestProfile,
  now: Date,
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(profile.interestWeights).map((topic) => {
      const anchor = [
        profile.interestUpdatedAt?.[topic],
        profile.updatedAt,
        profile.createdAt,
      ].find((value) => value && Number.isFinite(Date.parse(value)));
      return [
        topic,
        new Date(
          Math.min(anchor ? Date.parse(anchor) : now.getTime(), now.getTime()),
        ).toISOString(),
      ];
    }),
  );
}

export function effectiveInterests(
  profile: InterestProfile,
  now: Date,
): Record<string, number> {
  const anchors = interestAnchors(profile, now);
  return Object.fromEntries(
    Object.entries(profile.interestWeights).map(([topic, weight]) => {
      const days =
        Math.max(0, now.getTime() - Date.parse(anchors[topic]!)) / 86_400_000;
      const bounded = Number.isFinite(weight)
        ? Math.min(10, Math.max(0, weight))
        : 0;
      return [topic, bounded * 2 ** (-days / INTEREST_HALF_LIFE_DAYS)];
    }),
  );
}

export function applyInterestEvent(
  profile: InterestProfile,
  type: EventType,
  topics: string[],
  now: Date,
  durationSeconds?: number,
) {
  const interestUpdatedAt = interestAnchors(profile, now);
  const weights = { ...profile.interestWeights };
  if (incrementFor(type, durationSeconds) > 0) {
    const effective = effectiveInterests(
      { ...profile, interestUpdatedAt },
      now,
    );
    for (const topic of normalizedTopics(topics)) {
      weights[topic] = effective[topic] ?? 0;
      interestUpdatedAt[topic] = now.toISOString();
    }
  }
  return {
    interestWeights: updateInterests(weights, type, topics, durationSeconds),
    interestUpdatedAt,
  };
}

export function updateInterests(
  weights: Record<string, number>,
  type: EventType,
  topics: string[],
  durationSeconds?: number,
): Record<string, number> {
  const increment = incrementFor(type, durationSeconds);
  if (increment === 0) return { ...weights };
  const next = { ...weights };
  for (const topic of normalizedTopics(topics)) {
    next[topic] = Math.min(
      10,
      Math.round(((next[topic] ?? 0) + increment) * 100) / 100,
    );
  }
  return next;
}
