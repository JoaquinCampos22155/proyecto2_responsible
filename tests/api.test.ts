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
const setup = (repo = new MemoryRepository([article("story")])) => ({
  app: createApp({
    repo,
    verifyToken: tokens,
    now,
    budgetUsd: 20,
    allowedOrigins: ["http://localhost:5173"],
  }),
  repo,
});
const auth = (role: "user" | "admin") => ({ Authorization: `Bearer ${role}` });

describe("HTTP authentication and authorization", () => {
  it("rejects missing and invalid Firebase tokens", async () => {
    const { app } = setup();
    expect((await request(app).get("/v1/me")).status).toBe(401);
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
