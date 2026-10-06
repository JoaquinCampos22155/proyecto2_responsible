import { describe, expect, it } from "vitest";
import { assessEvidence } from "../src/domain/evidence.js";
import { updateInterests } from "../src/domain/interests.js";
import { rankFeed } from "../src/domain/ranking.js";
import { retrieveContext } from "../src/domain/retrieval.js";
import { canSpend, summarizeUsage } from "../src/domain/budget.js";
import {
  draftInput,
  eventInput,
  locationInput,
  sourceInput,
} from "../src/domain/validation.js";
import { article, source } from "./fixtures.js";

describe("evidence assessment", () => {
  it("requires independent reporting origins for corroboration", () => {
    expect(assessEvidence([source("one"), source("one")], false)).toBe(
      "single_source",
    );
    expect(assessEvidence([source("one"), source("two")], false)).toBe(
      "corroborated",
    );
  });

  it("counts syndicated copies as one source despite different publishers", () => {
    const syndicated = ["CNN", "NBC", "ABC"].map((publisher) => ({
      ...source(publisher),
      originSource: " Reuters ",
    }));
    expect(assessEvidence(syndicated, false)).toBe("single_source");
    expect(
      assessEvidence([...syndicated, source("Independent Desk")], false),
    ).toBe("corroborated");
  });

  it("uses a shared source group to identify syndication", () => {
    expect(
      assessEvidence(
        [
          { ...source("Outlet A"), sourceGroup: "Wire Pool" },
          { ...source("Outlet B"), sourceGroup: "wire pool" },
        ],
        false,
      ),
    ).toBe("single_source");
    expect(
      assessEvidence(
        [source("Reuters"), { ...source("Outlet A"), originSource: "reuters" }],
        false,
      ),
    ).toBe("single_source");
  });

  it("shows conflicting evidence and developing status", () => {
    expect(
      assessEvidence([source("one"), source("two", "disputes")], false),
    ).toBe("conflicting_sources");
    expect(assessEvidence([source("one")], true)).toBe("developing");
    expect(assessEvidence([], false)).toBe("unverified");
  });
});

describe("interest inference", () => {
  it("uses stronger signals for meaningful reading and sharing and caps weights", () => {
    expect(updateInterests({}, "article_open", ["technology"]).technology).toBe(
      0.5,
    );
    expect(
      updateInterests({}, "reading_time", ["technology"], 45).technology,
    ).toBe(1.5);
    expect(updateInterests({}, "share", ["technology"]).technology).toBe(2);
    expect(
      updateInterests({ technology: 9.5 }, "share", ["technology"]).technology,
    ).toBe(10);
  });

  it("ignores brief reads and normalizes duplicate topics", () => {
    expect(updateInterests({}, "reading_time", ["technology"], 5)).toEqual({});
    expect(
      updateInterests({}, "article_open", ["technology", "technology"])
        .technology,
    ).toBe(0.5);
  });
});

describe("feed ranking", () => {
  const profile = {
    uid: "u1",
    simulatedLocation: { country: "GT", region: "GT-GU" },
    interestWeights: { technology: 8 },
  };
  const now = new Date("2026-09-26T12:00:00.000Z");

  it("returns explanations for geographic and interest relevance", () => {
    const items = rankFeed(
      [article("city", { scope: "local", regions: ["GT-GU"] })],
      profile,
      now,
      10,
    );
    expect(items[0]?.reasons).toContain("Relevant to your selected region");
    expect(items[0]?.reasons).toContain("Matches your interest in technology");
  });

  it("exposes local, national, international and important stories despite high personal interest elsewhere", () => {
    const articles = [
      ...Array.from({ length: 8 }, (_, i) => article(`tech-${i}`)),
      article("local", {
        scope: "local",
        regions: ["GT-GU"],
        topics: ["culture"],
      }),
      article("international", {
        scope: "international",
        countries: ["US"],
        topics: ["culture"],
      }),
      article("important", { editorialPriority: "high", topics: ["culture"] }),
    ];
    const selected = rankFeed(articles, profile, now, 6).map(
      (item) => item.article.id,
    );
    expect(selected).toContain("local");
    expect(selected).toContain("international");
    expect(selected).toContain("important");
    expect(selected.some((id) => id.startsWith("tech-"))).toBe(true);
  });

  it("is deterministic and excludes drafts", () => {
    const articles = [
      article("b"),
      article("a"),
      article("draft", { status: "draft" }),
    ];
    expect(
      rankFeed(articles, profile, now, 10).map((item) => item.article.id),
    ).toEqual(["a", "b"]);
  });

  it("does not force another country’s local story into the local quota", () => {
    const stories = [
      article("foreign-local", {
        scope: "local",
        countries: ["US"],
        regions: ["US-NY"],
        topics: ["culture"],
      }),
      article("gt-national", { scope: "national", countries: ["GT"] }),
      article("world", { scope: "international", countries: ["MX"] }),
      article("gt-important", {
        scope: "national",
        countries: ["GT"],
        editorialPriority: "high",
      }),
      article("gt-science", {
        scope: "national",
        countries: ["GT"],
        topics: ["science"],
      }),
    ];
    expect(
      rankFeed(stories, profile, now, 4).map((item) => item.article.id),
    ).not.toContain("foreign-local");
  });

  it("preserves geographic breadth in a three-item feed", () => {
    const stories = [
      ...Array.from({ length: 4 }, (_, i) => article(`interest-${i}`)),
      article("local", {
        scope: "local",
        regions: ["GT-GU"],
        topics: ["culture"],
      }),
      article("world", {
        scope: "international",
        countries: ["MX"],
        topics: ["science"],
      }),
    ];
    const scopes = rankFeed(stories, profile, now, 3).map(
      (item) => item.article.scope,
    );
    expect(scopes).toContain("local");
    expect(scopes).toContain("national");
    expect(scopes).toContain("international");
  });
});

describe("retrieval", () => {
  it("selects only relevant published articles and returns source references", () => {
    const context = retrieveContext(
      [
        article("river", { title: "River cleanup in Guatemala" }),
        article("draft", { title: "River draft", status: "draft" }),
        article("sports", { title: "Football match" }),
      ],
      "river cleanup",
      2,
    );
    expect(context.map((item) => item.articleId)).toEqual(["river"]);
    expect(context[0]?.sources[0]?.publisher).toBe("demo");
  });

  it("limits retrieval and returns no unrelated articles", () => {
    expect(retrieveContext([article("a")], "volcano", 3)).toEqual([]);
    expect(
      retrieveContext(
        [article("a", { title: "River" }), article("b", { title: "River" })],
        "river",
        1,
      ),
    ).toHaveLength(1);
  });
});

describe("cost budget", () => {
  const usage = [
    {
      provider: "mock",
      model: "demo",
      feature: "chat",
      estimatedCostUsd: 1.25,
      timestamp: "2026-09-26T12:00:00.000Z",
    },
    {
      provider: "mock",
      model: "demo",
      feature: "image",
      estimatedCostUsd: 0.75,
      timestamp: "2026-09-26T12:00:00.000Z",
    },
  ];
  it("aggregates by feature and provider/model", () => {
    expect(summarizeUsage(usage, 20)).toMatchObject({
      totalUsd: 2,
      remainingUsd: 18,
      byFeature: { chat: 1.25, image: 0.75 },
      byProviderModel: { "mock/demo": 2 },
    });
  });
  it("rejects calls that cross the budget", () => {
    expect(canSpend(usage, 20, 18)).toBe(true);
    expect(canSpend(usage, 20, 18.01)).toBe(false);
  });
});

describe("input validation", () => {
  it("rejects bad article URLs and unknown fields", () => {
    expect(() =>
      draftInput.parse({
        title: "A title long enough",
        body: "A body long enough for publication",
        canonicalUrl: "javascript:alert(1)",
        scope: "national",
        countries: ["GT"],
        regions: [],
        topics: ["news"],
        editorialPriority: "normal",
      }),
    ).toThrow();
    expect(() => locationInput.parse({ country: "GT", gps: true })).toThrow();
  });
  it("accepts editorial priority and rejects the former significance key", () => {
    const valid = {
      title: "A title long enough",
      body: "A body long enough for publication",
      canonicalUrl: "https://example.com/story",
      scope: "national",
      countries: ["GT"],
      regions: [],
      topics: ["news"],
      editorialPriority: "normal",
    };
    expect(draftInput.parse(valid).editorialPriority).toBe("normal");
    expect(() =>
      draftInput.parse({ ...valid, significance: "high" }),
    ).toThrow();
  });
  it("accepts the expanded source types and optional provenance", () => {
    for (const sourceType of [
      "news",
      "wire",
      "official",
      "report",
      "eyewitness",
      "social",
      "other",
    ]) {
      expect(
        sourceInput.parse({
          ...source("agency"),
          sourceType,
          originSource: "Reuters",
          sourceGroup: "Wire Pool",
        }).sourceType,
      ).toBe(sourceType);
    }
    expect(() =>
      sourceInput.parse({ ...source("agency"), sourceType: "unknown" }),
    ).toThrow();
  });
  it("accepts only known event names and bounded reading time", () => {
    expect(
      eventInput.parse({
        type: "reading_time",
        articleId: "a",
        durationSeconds: 45,
      }).durationSeconds,
    ).toBe(45);
    expect(() =>
      eventInput.parse({
        type: "reading_time",
        articleId: "a",
        durationSeconds: 999999,
      }),
    ).toThrow();
    expect(() =>
      eventInput.parse({ type: "admin_promote", articleId: "a" }),
    ).toThrow();
  });
});
