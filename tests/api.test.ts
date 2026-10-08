import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/api/app.js";
import { MemoryRepository } from "../src/repository/memory.js";
import { article } from "./fixtures.js";

const now = () => "2026-09-26T12:00:00.000Z";
const tokens = async (token: string) => {
  if (token === "admin")
    return {
      uid: "admin-1",
      admin: true,
      name: "Editor",
      email: "editor@example.com",
      picture: null,
    };
  if (token === "user")
    return {
      uid: "u1",
      admin: false,
      name: "Reader",
      email: "reader@example.com",
      picture: null,
    };
  throw new Error("invalid token");
};
const setup = (
  repo = new MemoryRepository([article("story")]),
  deleteStoredImage?: (path: string) => Promise<void>,
) => ({
  app: createApp({
    repo,
    verifyToken: tokens,
    now,
    budgetUsd: 20,
    allowedOrigins: ["http://localhost:5173"],
    deleteStoredImage,
  }),
  repo,
});
const auth = (role: "user" | "admin") => ({ Authorization: `Bearer ${role}` });
const communitySubmission = {
  submissionId: "123e4567-e89b-12d3-a456-426614174000",
  title: "Una iniciativa comunitaria anuncia nuevas actividades",
  summary: "El grupo local anunció nuevas actividades para este fin de semana.",
  body: "El grupo comunitario compartió un reporte detallado con fechas, lugar y participantes. Esta información se incluye como ejemplo de una noticia enviada por una cuenta normal.",
  originDate: "2026-09-25",
  scope: "national",
  country: "GT",
  topics: ["community"],
  source: {
    name: "Anuncio de actividades",
    publisher: "Medio Comunitario",
    url: "https://community.example/report",
    sourceType: "news",
    stance: "supports",
  },
};

describe("HTTP authentication and authorization", () => {
  it("rejects missing and invalid Firebase tokens", async () => {
    const { app } = setup();
    expect((await request(app).get("/v1/me")).status).toBe(401);
    expect((await request(app).get("/v1/globe")).status).toBe(401);
    const invalid = await request(app)
      .get("/v1/me")
      .set("Authorization", "Bearer invalid");
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("prevents a normal user from publishing or viewing admin costs", async () => {
    const { app } = setup();
    expect(
      (
        await request(app)
          .post("/v1/admin/news/story/publish")
          .set(auth("user"))
      ).status,
    ).toBe(403);
    expect(
      (await request(app).get("/v1/admin/usage").set(auth("user"))).status,
    ).toBe(403);
  });

  it("derives identity from the token and rejects an unexpected UID field", async () => {
    const { app } = setup();
    const me = await request(app).get("/v1/me").set(auth("user"));
    expect(me.body.uid).toBe("u1");
    const event = await request(app)
      .post("/v1/events")
      .set(auth("user"))
      .send({ type: "share", articleId: "story", uid: "admin-1" });
    expect(event.status).toBe(400);
  });

  it("reports repository failures as server errors after valid authentication", async () => {
    const repo = new MemoryRepository();
    repo.saveUser = async () => {
      throw new Error("database unavailable");
    };
    const { app } = setup(repo);
    const response = await request(app).get("/v1/me").set(auth("user"));
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL");
  });
});

describe("reader API", () => {
  it("changes location and retrieves an explained feed and article", async () => {
    const { app } = setup();
    const location = await request(app)
      .put("/v1/me/location")
      .set(auth("user"))
      .send({ country: "GT", region: "GT-GU" });
    expect(location.status).toBe(200);
    const feed = await request(app).get("/v1/feed?limit=5").set(auth("user"));
    expect(feed.status).toBe(200);
    expect(feed.body.items[0].article.id).toBe("story");
    expect(Array.isArray(feed.body.items[0].reasons)).toBe(true);
    const detail = await request(app).get("/v1/news/story").set(auth("user"));
    expect(detail.body.sources[0].url).toBeTruthy();
  });

  it("returns this Sunday-based week's country totals and the ten highest-priority stories", async () => {
    const currentStories = Array.from({ length: 11 }, (_, index) =>
      article(`week-${index}`, {
        publishedAt: `2026-09-25T${String(index).padStart(2, "0")}:00:00.000Z`,
      }),
    );
    currentStories.push(
      article("top-priority", {
        publishedAt: "2026-09-25T08:00:00.000Z",
        editorialPriority: "high",
        scope: "international",
        countries: ["GT", "US"],
      }),
      article("previous-week", {
        publishedAt: "2026-09-19T23:59:59.000Z",
      }),
      article("draft-this-week", {
        publishedAt: "2026-09-25T09:00:00.000Z",
        status: "draft",
      }),
    );
    const { app } = setup(new MemoryRepository(currentStories));
    const response = await request(app).get("/v1/globe").set(auth("user"));

    expect(response.status).toBe(200);
    expect(response.body.week).toEqual({
      start: "2026-09-20",
      end: "2026-09-27",
    });
    expect(response.body.countries.GT.count).toBe(12);
    expect(response.body.countries.GT.items).toHaveLength(10);
    expect(response.body.countries.GT.items[0].article.id).toBe("top-priority");
    expect(response.body.countries.US).toMatchObject({ count: 1 });
    expect(response.body.worldStory.article.id).toBe("top-priority");
  });

  it("leaves the world feature empty when the week has no international story", async () => {
    const { app } = setup(
      new MemoryRepository([article("local-only", { scope: "national" })]),
    );
    const response = await request(app).get("/v1/globe").set(auth("user"));

    expect(response.status).toBe(200);
    expect(response.body.worldStory).toBeNull();
  });

  it("tracks interaction and returns grounded chat citations", async () => {
    const { app } = setup(
      new MemoryRepository([
        article("river", {
          title: "River cleanup",
          summary: "Classroom cleanup demo",
        }),
      ]),
    );
    const event = await request(app)
      .post("/v1/events")
      .set(auth("user"))
      .send({ type: "share", articleId: "river" });
    expect(event.status).toBe(201);
    const response = await request(app)
      .post("/v1/chat")
      .set(auth("user"))
      .send({ question: "What happened in the river cleanup?" });
    expect(response.status).toBe(200);
    expect(response.body.citations[0].articleId).toBe("river");
    expect(response.body.providerMode).toBe("mock");
  });
});

describe("editor API", () => {
  it("creates and publishes a sourced draft as an administrator", async () => {
    const { app } = setup();
    const created = await request(app)
      .post("/v1/admin/news")
      .set(auth("admin"))
      .send({
        title: "Synthetic classroom city update",
        body: "This is a synthetic classroom city update.",
        canonicalUrl: "https://demo.example/city",
        scope: "local",
        countries: ["GT"],
        regions: ["GT-GU"],
        topics: ["culture"],
        editorialPriority: "normal",
      });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    const source = await request(app)
      .post(`/v1/admin/news/${id}/sources`)
      .set(auth("admin"))
      .send({
        name: "Demo report",
        url: "https://demo.example/source",
        publisher: "Demo desk",
        sourceType: "wire",
        stance: "supports",
        originSource: "Demo Wire",
        sourceGroup: "Demo Syndication",
      });
    expect(source.status).toBe(200);
    expect(source.body.sources[0]).toMatchObject({
      sourceType: "wire",
      originSource: "Demo Wire",
      sourceGroup: "Demo Syndication",
    });
    const published = await request(app)
      .post(`/v1/admin/news/${id}/publish`)
      .set(auth("admin"));
    expect(published.status).toBe(200);
    expect(published.body.humanReview.reviewedBy).toBe("admin-1");
  });

  it("allows an editor to clear a draft image with JSON null", async () => {
    const { app } = setup();
    const created = await request(app)
      .post("/v1/admin/news")
      .set(auth("admin"))
      .send({
        title: "Synthetic image-free story",
        body: "This is a synthetic image-free classroom story.",
        canonicalUrl: "https://demo.example/no-image",
        scope: "national",
        countries: ["GT"],
        regions: [],
        topics: ["culture"],
        editorialPriority: "normal",
      });
    const cleared = await request(app)
      .put(`/v1/admin/news/${created.body.id as string}/image`)
      .set(auth("admin"))
      .set("Content-Type", "application/json")
      .send("null");
    expect(cleared.status).toBe(200);
    expect(cleared.body.image).toBeNull();
  });

  it("returns consistent validation errors for bad input", async () => {
    const { app } = setup();
    const response = await request(app)
      .put("/v1/me/location")
      .set(auth("user"))
      .send({ country: "bad", latitude: 4 });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("community submissions and moderation", () => {
  it("accepts a sourced report from the signed-in user and returns only that user's reports", async () => {
    const { app, repo } = setup();
    const created = await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send(communitySubmission);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: "pending_review",
      submittedByUid: "u1",
      publishedAt: null,
      originDate: "2026-09-25",
      countries: ["GT"],
      sources: [{ publisher: "Medio Comunitario" }],
    });
    const own = await request(app).get("/v1/me/submissions").set(auth("user"));
    expect(own.body.items.map((item: { id: string }) => item.id)).toContain(
      created.body.id,
    );
    expect(await repo.listSubmittedArticles("someone-else")).toEqual([]);
    const adminDrafts = await request(app)
      .get("/v1/admin/news")
      .set(auth("admin"));
    expect(
      adminDrafts.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(created.body.id);
  });

  it("requires a source and rejects caller-supplied ownership", async () => {
    const { app } = setup();
    const missingSource = await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send({ ...communitySubmission, source: undefined });
    expect(missingSource.status).toBe(400);

    const forgedOwner = await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send({ ...communitySubmission, submittedByUid: "admin-1" });
    expect(forgedOwner.status).toBe(400);
  });

  it("lets only admins review submissions and preserves the origin date on approval", async () => {
    const { app } = setup();
    const created = await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send(communitySubmission);
    const id = created.body.id as string;

    expect(
      (await request(app).get("/v1/admin/submissions").set(auth("user")))
        .status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/v1/admin/submissions/${id}/approve`)
          .set(auth("user"))
          .send({ editorialPriority: "high" })
      ).status,
    ).toBe(403);

    const approved = await request(app)
      .post(`/v1/admin/submissions/${id}/approve`)
      .set(auth("admin"))
      .send({ editorialPriority: "high" });
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({
      status: "published",
      editorialPriority: "high",
      originDate: "2026-09-25",
      publishedAt: "2026-09-25T06:00:00.000Z",
      humanReview: { reviewedBy: "admin-1" },
    });
    const publicNews = await request(app)
      .get(`/v1/news/${id}`)
      .set(auth("user"));
    expect(publicNews.body.status).toBe("published");
    expect(publicNews.body).not.toHaveProperty("submittedByUid");
  });

  it("filters the review queue by submission date and country", async () => {
    const { app } = setup();
    await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send(communitySubmission);
    const matching = await request(app)
      .get(
        "/v1/admin/submissions?status=pending_review&from=2026-09-26&to=2026-09-26&country=GT",
      )
      .set(auth("admin"));
    const outsideRange = await request(app)
      .get("/v1/admin/submissions?from=2026-09-27&country=GT")
      .set(auth("admin"));

    expect(matching.body.items).toHaveLength(1);
    expect(outsideRange.body.items).toHaveLength(0);
  });

  it("permanently removes an approved or pending community post and its stored image", async () => {
    const deletedPaths: string[] = [];
    const { app, repo } = setup(new MemoryRepository(), async (path) => {
      deletedPaths.push(path);
    });
    const objectPath = `user-submissions/u1/123e4567-e89b-12d3-a456-426614174000/image.jpg`;
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/project2.firebasestorage.app/o/${encodeURIComponent(objectPath)}?alt=media&token=demo`;
    const created = await request(app)
      .post("/v1/me/submissions")
      .set(auth("user"))
      .send({
        ...communitySubmission,
        image: {
          url: imageUrl,
          provider: "firebase-storage",
          originalUrl: null,
          license: null,
          attribution: "Imagen enviada por la comunidad",
          generatedByAI: false,
          alteredByAI: false,
          retrievedAt: now(),
          storagePath: objectPath,
        },
      });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    const removal = await request(app)
      .delete(`/v1/admin/submissions/${id}`)
      .set(auth("admin"));

    expect(removal.status).toBe(200);
    expect(await repo.getArticle(id)).toBeNull();
    expect(deletedPaths).toEqual([objectPath]);
    expect((await repo.listAudit()).at(-1)).toMatchObject({
      action: "delete_submission",
      articleId: id,
      actorUid: "admin-1",
    });
  });
});

describe("Firebase-safe image removal transport", () => {
  it("accepts the exact null envelope and rejects extra envelope fields", async () => {
    const draft = { ...article("image-draft"), status: "draft" as const };
    const { app } = setup(new MemoryRepository([draft]));
    const cleared = await request(app)
      .put("/v1/admin/news/image-draft/image")
      .set(auth("admin"))
      .send({ image: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.image).toBeNull();
    const invalid = await request(app)
      .put("/v1/admin/news/image-draft/image")
      .set(auth("admin"))
      .send({ image: null, status: "published" });
    expect(invalid.status).toBe(400);
  });
});
