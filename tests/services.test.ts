import { describe, expect, it } from "vitest";
import { MemoryRepository } from "../src/repository/memory.js";
import { NewsService } from "../src/services/news.js";
import { UserService } from "../src/services/users.js";
import { ChatService, MockChatProvider } from "../src/services/chat.js";
import {
  ImageService,
  MockStockImageProvider,
} from "../src/services/images.js";
import { UsageService } from "../src/services/usage.js";
import { article, source } from "./fixtures.js";

const now = () => "2026-09-26T12:00:00.000Z";
const draft = {
  title: "Synthetic river cleanup starts today",
  body: "This is a synthetic classroom report about a river cleanup.",
  summary: "Demo river cleanup",
  author: "Demo desk",
  publisher: "Demo News",
  canonicalUrl: "https://demo.example/river",
  scope: "local" as const,
  countries: ["GT"],
  regions: ["GT-GU"],
  topics: ["environment"],
  editorialPriority: "normal" as const,
};

describe("editorial workflow", () => {
  it("creates a draft, attaches evidence, assesses it, and records human publication", async () => {
    const repo = new MemoryRepository();
    const service = new NewsService(repo, now);
    const created = await service.createDraft(draft, "admin-1");
    expect(created.status).toBe("draft");
    await service.addSource(created.id, source("one"), "admin-1");
    await service.addSource(created.id, source("two"), "admin-1");
    expect(
      (await service.assess(created.id, "admin-1")).verificationStatus,
    ).toBe("corroborated");
    const published = await service.publish(created.id, "admin-1");
    expect(published.status).toBe("published");
    expect(published.humanReview?.reviewedBy).toBe("admin-1");
    expect((await repo.listAudit()).map((row) => row.action)).toEqual([
      "create",
      "edit",
      "edit",
      "assess",
      "publish",
    ]);
  });

  it("refuses publishing without a source and hides drafts from user reads", async () => {
    const repo = new MemoryRepository();
    const service = new NewsService(repo, now);
    const created = await service.createDraft(draft, "admin-1");
    await expect(service.publish(created.id, "admin-1")).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    await expect(service.getPublished(created.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("archives published stories without deleting provenance", async () => {
    const repo = new MemoryRepository([article("existing")]);
    const service = new NewsService(repo, now);
    const archived = await service.archive("existing", "admin-1");
    expect(archived.status).toBe("archived");
    expect(archived.sources).toHaveLength(1);
  });
});

describe("profile and behavior", () => {
  it("creates a minimal profile and changes simulated location", async () => {
    const service = new UserService(new MemoryRepository(), now);
    const profile = await service.getOrCreate({
      uid: "u1",
      name: "Demo",
      email: "demo@example.com",
      picture: null,
    });
    expect(profile.simulatedLocation.country).toBe("GT");
    expect(
      (await service.setLocation("u1", { country: "US", region: "US-NY" }))
        .simulatedLocation,
    ).toEqual({ country: "US", region: "US-NY" });
  });

  it("records events only for published articles and updates interests", async () => {
    const repo = new MemoryRepository([article("story")]);
    const service = new UserService(repo, now);
    await service.getOrCreate({
      uid: "u1",
      name: null,
      email: null,
      picture: null,
    });
    const result = await service.recordEvent("u1", {
      type: "share",
      articleId: "story",
    });
    expect(result.profile.interestWeights.technology).toBe(2);
    expect((await repo.listEvents("u1"))[0]?.uid).toBe("u1");
    await expect(
      service.recordEvent("u1", { type: "share", articleId: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("grounded mock chat", () => {
  it("returns selected citations and clearly marks uncertainty", async () => {
    const repo = new MemoryRepository([
      article("river", {
        title: "River cleanup in Guatemala",
        summary: "A classroom demo cleanup.",
      }),
    ]);
    const service = new ChatService(
      repo,
      new MockChatProvider(),
      new UsageService(repo, 20, now),
      now,
    );
    const response = await service.answer(
      "u1",
      "What happened in the river cleanup?",
    );
    expect(response.providerMode).toBe("mock");
    expect(response.citations[0]?.articleId).toBe("river");
    expect(response.uncertainty).toBe("single_source");
    expect(response.answer).toContain("classroom demo");
  });

  it("admits missing evidence instead of inventing an answer", async () => {
    const repo = new MemoryRepository();
    const service = new ChatService(
      repo,
      new MockChatProvider(),
      new UsageService(repo, 20, now),
      now,
    );
    const response = await service.answer("u1", "What happened to the river?");
    expect(response.citations).toEqual([]);
    expect(response.uncertainty).toBe("unverified");
  });
});

describe("image and usage adapters", () => {
  it("returns a stock mock with provenance and no AI label", async () => {
    const images = new ImageService(new MockStockImageProvider(), now);
    const result = await images.search("river cleanup");
    expect(result[0]).toMatchObject({
      provider: "mock-stock",
      generatedByAI: false,
      alteredByAI: false,
    });
    expect(result[0]?.license).toBeTruthy();
  });

  it("tracks cost and prevents a call over the configured budget", async () => {
    const repo = new MemoryRepository();
    const usage = new UsageService(repo, 2, now);
    await usage.record({
      provider: "mock",
      model: "demo",
      feature: "chat",
      estimatedCostUsd: 1.5,
      actorUid: "u1",
    });
    expect((await usage.report()).remainingUsd).toBe(0.5);
    await expect(usage.assertBudget(0.51)).rejects.toMatchObject({
      code: "BUDGET_EXCEEDED",
    });
  });
});
