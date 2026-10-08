import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import request from "supertest";
import { createApp } from "../src/api/app.js";
import { FirestoreRepository } from "../src/repository/firestore.js";
import { article, source } from "./fixtures.js";
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
    const stored = article("stored", {
      title: "A fully sourced international report",
      body: "Detailed report body with the full editorial context.",
      summary: "A concise summary for reader cards.",
      author: "Community correspondent",
      publisher: "Example Wire",
      canonicalUrl: "https://wire.example/full-report",
      publishedAt: "2026-09-25T14:30:00.000Z",
      scope: "international",
      countries: ["IT", "GT"],
      regions: ["IT-LAZ", "GT-GU"],
      topics: ["weather", "public-health"],
      editorialPriority: "high",
      verificationStatus: "corroborated",
      sources: [
        {
          ...source("wire", "supports"),
          originSource: "Original dispatch",
          sourceGroup: "wire-service",
          credibilityNote: "Confirmed by the editor.",
        },
        source("official", "context"),
      ],
      image: {
        url: "https://images.example/story.webp",
        provider: "firebase-storage",
        originalUrl: null,
        sourcePageUrl: "https://wire.example/full-report",
        license: "CC BY 4.0",
        attribution: "Example photographer",
        generatedByAI: false,
        alteredByAI: false,
        retrievedAt: "2026-09-25T14:00:00.000Z",
        storagePath: "news/stored/cover.webp",
      },
      aiDisclosure: {
        assisted: true,
        note: "AI helped prepare the first summary draft.",
      },
      developing: true,
      submittedByUid: "reader-1",
      originDate: "2026-09-25",
    });
    await repo.saveArticle(stored);
    expect(await repo.getArticle("stored")).toEqual(stored);
    expect(await repo.listArticles()).toEqual([stored]);
    expect(
      (await getFirestore(app).collection("news").doc("stored").get()).data(),
    ).toEqual(stored);
  });

  it("round trips profile, event, audit and usage collections", async () => {
    const profile = {
      uid: "u1",
      displayName: "Reader Example",
      email: "reader@example.test",
      photoURL: "https://images.example/reader.webp",
      simulatedLocation: { country: "GT", region: "GT-GU" },
      interestWeights: { climate: 2, education: 1 },
      createdAt: "2026-09-26T12:00:00.000Z",
      updatedAt: "2026-09-26T12:00:00.000Z",
    };
    await repo.saveUser(profile);
    await repo.addEvent({
      id: "event1",
      uid: "u1",
      type: "share",
      articleId: "stored",
      durationSeconds: 37,
      topic: "climate",
      timestamp: profile.createdAt,
    });
    await repo.addAudit({
      id: "audit1",
      articleId: "stored",
      actorUid: "admin",
      action: "publish",
      timestamp: profile.createdAt,
      details: { previousStatus: "draft", sourceCount: 2 },
    });
    await repo.addUsage({
      id: "usage1",
      provider: "mock",
      model: "demo",
      feature: "chat",
      inputTokens: 81,
      outputTokens: 44,
      estimatedCostUsd: 0,
      timestamp: profile.createdAt,
      actorUid: "u1",
      correlationId: "request-123",
    });
    expect(await repo.getUser("u1")).toEqual(profile);
    expect(await repo.listEvents("u1")).toEqual([
      {
        id: "event1",
        uid: "u1",
        type: "share",
        articleId: "stored",
        durationSeconds: 37,
        topic: "climate",
        timestamp: profile.createdAt,
      },
    ]);
    expect(await repo.listAudit()).toEqual([
      {
        id: "audit1",
        articleId: "stored",
        actorUid: "admin",
        action: "publish",
        timestamp: profile.createdAt,
        details: { previousStatus: "draft", sourceCount: 2 },
      },
    ]);
    expect(await repo.listUsage()).toEqual([
      {
        id: "usage1",
        provider: "mock",
        model: "demo",
        feature: "chat",
        inputTokens: 81,
        outputTokens: 44,
        estimatedCostUsd: 0,
        timestamp: profile.createdAt,
        actorUid: "u1",
        correlationId: "request-123",
      },
    ]);
  });

  it("persists a community report through API submission, review and publication", async () => {
    const api = createApp({
      repo,
      verifyToken: async (token) => {
        if (token === "admin")
          return {
            uid: "editor-1",
            admin: true,
            name: "Editor Example",
            email: "editor@example.test",
            picture: null,
          };
        if (token === "reader")
          return {
            uid: "reader-1",
            admin: false,
            name: "Reader Example",
            email: "reader@example.test",
            picture: null,
          };
        throw new Error("Invalid test token");
      },
      now: () => "2026-09-26T12:00:00.000Z",
      budgetUsd: 20,
      allowedOrigins: ["http://localhost:5173"],
    });
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const payload = {
      submissionId: id,
      title: "A community report with a documented source",
      summary: "A short description prepared by the person reporting it.",
      body: "The complete report includes what happened, where, who was involved and why the community considers it relevant.",
      originDate: "2026-09-25",
      scope: "national",
      country: "GT",
      topics: ["community", "education"],
      source: {
        name: "Community activity announcement",
        publisher: "Community Newsroom",
        url: "https://community.example/report",
        sourceType: "report",
        stance: "supports",
      },
    };

    const submitted = await request(api)
      .post("/v1/me/submissions")
      .set("Authorization", "Bearer reader")
      .send(payload);
    expect(submitted.status).toBe(201);
    expect(submitted.body).toMatchObject({
      id,
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      originDate: payload.originDate,
      createdAt: "2026-09-26T12:00:00.000Z",
      publishedAt: null,
      status: "pending_review",
      countries: ["GT"],
      topics: payload.topics,
      editorialPriority: "normal",
      verificationStatus: "unverified",
      submittedByUid: "reader-1",
      sources: [
        {
          name: payload.source.name,
          publisher: payload.source.publisher,
          url: payload.source.url,
          sourceType: payload.source.sourceType,
          stance: payload.source.stance,
          retrievedAt: "2026-09-26T12:00:00.000Z",
        },
      ],
      image: null,
      aiDisclosure: { assisted: false, note: null },
      humanReview: null,
    });
    const submittedRow = await getFirestore(app)
      .collection("news")
      .doc(id)
      .get();
    expect(submittedRow.data()).toEqual(submitted.body);

    const ownReports = await request(api)
      .get("/v1/me/submissions")
      .set("Authorization", "Bearer reader");
    expect(ownReports.status).toBe(200);
    expect(ownReports.body.items).toEqual([submitted.body]);

    const approved = await request(api)
      .post(`/v1/admin/submissions/${id}/approve`)
      .set("Authorization", "Bearer admin")
      .send({ editorialPriority: "high" });
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({
      id,
      status: "published",
      editorialPriority: "high",
      originDate: "2026-09-25",
      publishedAt: "2026-09-25T06:00:00.000Z",
      humanReview: {
        reviewedBy: "editor-1",
        reviewedAt: "2026-09-26T12:00:00.000Z",
      },
      submittedByUid: "reader-1",
      verificationStatus: "single_source",
    });
    expect(await repo.getArticle(id)).toEqual(approved.body);

    const publishedForReaders = await request(api)
      .get(`/v1/news/${id}`)
      .set("Authorization", "Bearer reader");
    expect(publishedForReaders.status).toBe(200);
    expect(publishedForReaders.body.status).toBe("published");
    expect(publishedForReaders.body).not.toHaveProperty("submittedByUid");

    const auditRows = await repo.listAudit();
    expect(auditRows).toHaveLength(2);
    expect(auditRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          articleId: id,
          actorUid: "reader-1",
          action: "submit",
          timestamp: "2026-09-26T12:00:00.000Z",
        }),
        expect.objectContaining({
          articleId: id,
          actorUid: "editor-1",
          action: "approve_submission",
          timestamp: "2026-09-26T12:00:00.000Z",
          details: { editorialPriority: "high", originDate: "2026-09-25" },
        }),
      ]),
    );
  });
});
