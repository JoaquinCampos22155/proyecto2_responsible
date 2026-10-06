import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FirestoreRepository } from "../src/repository/firestore.js";
import { article } from "./fixtures.js";
import { ChatService, MockChatProvider } from "../src/services/chat.js";
import { UsageService } from "../src/services/usage.js";

let app: App;
let repo: FirestoreRepository;
beforeAll(() => {
  app = initializeApp(
    { projectId: "demo-project2-responsible" },
    "adapter-test",
  );
  repo = new FirestoreRepository(getFirestore(app));
});
beforeEach(async () => {
  const db = getFirestore(app);
  for (const collection of [
    "news",
    "users",
    "userEvents",
    "audit",
    "apiUsage",
  ]) {
    await db.recursiveDelete(db.collection(collection));
  }
});
afterAll(async () => {
  await deleteApp(app);
});

describe("Firestore repository", () => {
  it("persists usage from a mock chat with no token counts", async () => {
    await repo.saveArticle(article("river", { title: "River cleanup" }));
    const now = () => "2026-09-26T12:00:00.000Z";
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
    expect((await repo.listUsage())[0]).toMatchObject({
      provider: "mock",
      estimatedCostUsd: 0,
    });
  });
  it("round trips an article and lists it", async () => {
    await repo.saveArticle(article("stored"));
    expect((await repo.getArticle("stored"))?.title).toBe("Demo stored");
    expect((await repo.listArticles()).map((item) => item.id)).toEqual([
      "stored",
    ]);
  });

  it("round trips profile, event, audit and usage collections", async () => {
    const profile = {
      uid: "u1",
      displayName: null,
      email: null,
      photoURL: null,
      simulatedLocation: { country: "GT" },
      interestWeights: {},
      createdAt: "2026-09-26T12:00:00.000Z",
      updatedAt: "2026-09-26T12:00:00.000Z",
    };
    await repo.saveUser(profile);
    await repo.addEvent({
      id: "event1",
      uid: "u1",
      type: "share",
      articleId: "stored",
      timestamp: profile.createdAt,
    });
    await repo.addAudit({
      id: "audit1",
      articleId: "stored",
      actorUid: "admin",
      action: "publish",
      timestamp: profile.createdAt,
    });
    await repo.addUsage({
      provider: "mock",
      model: "demo",
      feature: "chat",
      estimatedCostUsd: 0,
      timestamp: profile.createdAt,
    });
    expect((await repo.getUser("u1"))?.simulatedLocation.country).toBe("GT");
    expect(await repo.listEvents("u1")).toHaveLength(1);
    expect(await repo.listAudit()).toHaveLength(1);
    expect(await repo.listUsage()).toHaveLength(1);
  });
});
