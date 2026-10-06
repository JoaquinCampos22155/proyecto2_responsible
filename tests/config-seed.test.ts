import { describe, expect, it } from "vitest";
import { assertProject2Target, parseRuntimeConfig } from "../src/config.js";
import { buildSeedArticles } from "../src/demo/seed-data.js";

describe("Project 2 target guard", () => {
  it("rejects Project 1 and unexpected project IDs", () => {
    expect(() => assertProject2Target("proyecto1responsibleai")).toThrow();
    expect(() => assertProject2Target("some-other-project")).toThrow();
    expect(assertProject2Target("proyecto2responsibleai")).toBe(
      "proyecto2responsibleai",
    );
    expect(assertProject2Target("demo-project2-responsible")).toBe(
      "demo-project2-responsible",
    );
  });

  it("parses budget and CORS origins without enabling paid providers", () => {
    expect(
      parseRuntimeConfig({
        FIREBASE_PROJECT_ID: "proyecto2responsibleai",
        AI_BUDGET_USD: "20",
        CORS_ORIGINS: "http://localhost:5173",
      }),
    ).toMatchObject({
      projectId: "proyecto2responsibleai",
      budgetUsd: 20,
      allowedOrigins: ["http://localhost:5173"],
      aiProvider: "mock",
    });
    expect(() =>
      parseRuntimeConfig({
        FIREBASE_PROJECT_ID: "proyecto2responsibleai",
        AI_PROVIDER: "openai",
      }),
    ).toThrow();
  });

  it("uses the demo project namespace when the emulator runs with the copied example env", () => {
    const config = parseRuntimeConfig({
      FIREBASE_PROJECT_ID: "proyecto2responsibleai",
      GCLOUD_PROJECT: "demo-project2-responsible",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    });
    expect(config.projectId).toBe("demo-project2-responsible");
  });

  it("enables Gemini and Pexels only with their server keys", () => {
    const base = { FIREBASE_PROJECT_ID: "proyecto2responsibleai" };
    expect(() =>
      parseRuntimeConfig({ ...base, AI_PROVIDER: "gemini" }),
    ).toThrow();
    expect(() =>
      parseRuntimeConfig({ ...base, IMAGE_PROVIDER: "pexels" }),
    ).toThrow();
    expect(
      parseRuntimeConfig({
        ...base,
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "chat-key",
        IMAGE_PROVIDER: "pexels",
        PEXELS_API_KEY: "image-key",
      }),
    ).toMatchObject({ aiProvider: "gemini", imageProvider: "pexels" });
  });
});

describe("synthetic seed stories", () => {
  it("covers scopes, topics, evidence and image disclosure", () => {
    const stories = buildSeedArticles();
    expect(stories.length).toBeGreaterThanOrEqual(10);
    expect(new Set(stories.map((item) => item.scope))).toEqual(
      new Set(["local", "national", "international"]),
    );
    expect(
      stories.some((item) => item.verificationStatus === "single_source"),
    ).toBe(true);
    expect(
      stories.some((item) => item.verificationStatus === "corroborated"),
    ).toBe(true);
    expect(
      stories.some((item) => item.verificationStatus === "conflicting_sources"),
    ).toBe(true);
    expect(stories.some((item) => item.image?.generatedByAI)).toBe(true);
    expect(
      stories.some((item) => item.image && !item.image.generatedByAI),
    ).toBe(true);
    expect(
      stories.every(
        (item) =>
          item.id.startsWith("demo-") && item.title.startsWith("[DEMO]"),
      ),
    ).toBe(true);
  });
});
