import { describe, expect, it } from "vitest";
import { rankFeed } from "../src/domain/ranking.js";
import { UserService } from "../src/services/users.js";
import { MemoryRepository } from "../src/repository/memory.js";
import type { UserProfile } from "../src/domain/types.js";
import { article } from "./fixtures.js";

const start = "2026-10-01T12:00:00.000Z";
const later = "2026-10-15T12:00:00.000Z";
const identity = {
  uid: "reader",
  name: "Reader",
  email: "reader@example.test",
  picture: null,
};
const profile = (extra: Partial<UserProfile> = {}): UserProfile => ({
  uid: "reader",
  displayName: "Reader",
  email: identity.email,
  photoURL: null,
  simulatedLocation: { country: "GT" },
  interestWeights: { climate: 8, culture: 3 },
  interestUpdatedAt: { climate: start, culture: later },
  createdAt: start,
  updatedAt: start,
  ...extra,
});

describe("per-topic interest decay", () => {
  it("lets recent interests outrank a larger but inactive interest after two half-lives", () => {
    const stories = [
      article("climate", { topics: ["climate"] }),
      article("culture", { topics: ["culture"] }),
    ];
    expect(
      rankFeed(stories, profile(), new Date(later), 2)[0]?.article.id,
    ).toBe("culture");
    expect(
      rankFeed(stories, profile(), new Date(start), 2)[0]?.article.id,
    ).toBe("climate");
  });
  it.each([
    ["2026-10-08T12:00:00.000Z", 6],
    [later, 4],
  ])(
    "adds new activity to the decayed weight at %s",
    async (timestamp, expected) => {
      const repo = new MemoryRepository([
        article("climate", { topics: ["climate"] }),
      ]);
      await repo.saveUser(
        profile({ interestUpdatedAt: { climate: start, culture: start } }),
      );
      const result = await new UserService(repo, () => timestamp).recordEvent(
        "reader",
        { type: "share", articleId: "climate" },
      );
      expect(result.profile.interestWeights.climate).toBe(expected);
      expect(result.profile.interestUpdatedAt?.climate).toBe(timestamp);
      expect(result.profile.interestWeights.culture).toBe(3);
      expect(result.profile.interestUpdatedAt?.culture).toBe(start);
    },
  );
  it("does not refresh topic clocks on impressions, brief reads or location changes", async () => {
    const repo = new MemoryRepository([
      article("climate", { topics: ["climate"] }),
    ]);
    await repo.saveUser(profile());
    const service = new UserService(repo, () => later);
    await service.recordEvent("reader", {
      type: "impression",
      articleId: "climate",
    });
    await service.recordEvent("reader", {
      type: "reading_time",
      articleId: "climate",
      durationSeconds: 5,
    });
    await service.setLocation("reader", { country: "US" });
    expect((await repo.getUser("reader"))?.interestUpdatedAt?.climate).toBe(
      start,
    );
    const next = await service.recordEvent("reader", {
      type: "article_open",
      articleId: "climate",
    });
    expect(next.profile.interestWeights.climate).toBe(2.5);
  });
  it("does not decay an untouched topic twice when a different topic is used halfway through", async () => {
    const repo = new MemoryRepository([
      article("climate", { topics: ["climate"] }),
      article("sports", { topics: ["sports"] }),
    ]);
    await repo.saveUser(
      profile({ interestUpdatedAt: { climate: start, culture: start } }),
    );
    await new UserService(repo, () => "2026-10-08T12:00:00.000Z").recordEvent(
      "reader",
      { type: "share", articleId: "sports" },
    );
    expect((await repo.getUser("reader"))?.interestWeights.climate).toBe(8);
    const result = await new UserService(repo, () => later).recordEvent(
      "reader",
      { type: "share", articleId: "climate" },
    );
    expect(result.profile.interestWeights.climate).toBe(4);
  });
  it("anchors legacy profiles once so unrelated activity cannot make old interests fresh", async () => {
    const repo = new MemoryRepository([
      article("sports", { topics: ["sports"] }),
      article("climate", { topics: ["climate"] }),
    ]);
    const legacy = profile();
    delete legacy.interestUpdatedAt;
    await repo.saveUser(legacy);
    const service = new UserService(repo, () => later);
    await service.getOrCreate(identity);
    await service.recordEvent("reader", { type: "share", articleId: "sports" });
    const reloaded = await new UserService(repo, () => later).getOrCreate(
      identity,
    );
    expect(reloaded.interestUpdatedAt?.climate).toBe(start);
    expect(reloaded.interestUpdatedAt?.sports).toBe(later);
    const result = await service.recordEvent("reader", {
      type: "share",
      articleId: "climate",
    });
    expect(result.profile.interestWeights.climate).toBe(4);
  });
  it("applies the cap after decay and never increases weights for future or invalid dates", async () => {
    const repo = new MemoryRepository([
      article("climate", { topics: ["climate"] }),
    ]);
    await repo.saveUser(
      profile({
        interestWeights: { climate: 10 },
        interestUpdatedAt: { climate: "2026-11-01T12:00:00.000Z" },
      }),
    );
    const service = new UserService(repo, () => later);
    expect(
      (
        await service.recordEvent("reader", {
          type: "share",
          articleId: "climate",
        })
      ).profile.interestWeights.climate,
    ).toBe(10);
    await repo.saveUser(profile({ interestUpdatedAt: { climate: "invalid" } }));
    expect(
      (
        await service.recordEvent("reader", {
          type: "share",
          articleId: "climate",
        })
      ).profile.interestWeights.climate,
    ).toBe(4);
  });
});
