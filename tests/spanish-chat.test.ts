import { describe, expect, it } from "vitest";
import { buildSeedArticles } from "../src/demo/seed-data.js";
import { retrieveContext } from "../src/domain/retrieval.js";
import { MemoryRepository } from "../src/repository/memory.js";
import { ChatService, MockChatProvider } from "../src/services/chat.js";
import { UsageService } from "../src/services/usage.js";
import { UserService } from "../src/services/users.js";
import { article } from "./fixtures.js";

const now = () => "2026-09-26T12:00:00.000Z";

async function chatFor(
  country: string,
  region?: string,
  interestWeights: Record<string, number> = {},
) {
  const repo = new MemoryRepository(buildSeedArticles());
  const users = new UserService(repo, now);
  await users.getOrCreate({
    uid: "u1",
    name: null,
    email: null,
    picture: null,
  });
  await users.setLocation("u1", { country, ...(region ? { region } : {}) });
  const profile = await repo.getUser("u1");
  await repo.saveUser({ ...profile!, interestWeights });
  return new ChatService(
    repo,
    new MockChatProvider(),
    new UsageService(repo, 20, now),
    now,
  );
}

describe("Spanish grounded news chat", () => {
  it("answers the requested daily reading question with local, national and world evidence", async () => {
    const response = await (
      await chatFor("GT", "GT-GU")
    ).answer("u1", "qué noticias debo leer hoy");
    expect(response.citations.map((item) => item.articleId)).toEqual([
      "demo-guatemala-library",
      "demo-guatemala-schools",
      "demo-international-weather",
    ]);
    expect(response.answer).toMatch(/fictici/);
    expect(response.answer).toContain("biblioteca");
  });

  it("uses the selected region for general news recommendations", async () => {
    const response = await (
      await chatFor("US", "US-NY")
    ).answer("u1", "qué noticias debo leer hoy");
    expect(response.citations.map((item) => item.articleId)).toEqual([
      "demo-new-york-garden",
      "demo-united-states-research",
      "demo-international-health",
    ]);
  });

  it("uses reading interests to select the relevant local story", async () => {
    const response = await (
      await chatFor("GT", "GT-GU", { environment: 8 })
    ).answer("u1", "recomiéndame noticias");
    expect(response.citations[0]?.articleId).toBe("demo-guatemala-river");
    expect(response.citations).toHaveLength(3);
  });

  it.each([
    "hay noticias del clima?",
    "¿Hay noticias de meteorología?",
    "noticias del tiempo",
    "weather news",
    "hay noticias del clima en Guatemala?",
  ])(
    "finds the weather exercise for %s without claiming a real forecast",
    async (question) => {
      const response = await (await chatFor("GT")).answer("u1", question);
      expect(response.citations.map((item) => item.articleId)).toEqual([
        "demo-international-weather",
      ]);
      expect(response.answer).toMatch(/fictici/);
      expect(response.answer).toMatch(/meteorológic/);
      expect(response.uncertainty).toBe("corroborated");
    },
  );

  it.each([
    "qué noticias debo leer hoy sobre volcanes",
    "hay noticias de volcanes en Guatemala?",
    "hay noticias de criptomonedas?",
    "cómo preparo una sopa?",
    "¿Cuál es la capital de Canadá?",
  ])("keeps missing evidence truthful for %s", async (question) => {
    const response = await (await chatFor("GT")).answer("u1", question);
    expect(response.citations).toEqual([]);
    expect(response.uncertainty).toBe("unverified");
    expect(response.answer).toContain("No tengo suficiente información");
  });

  it("uses full normalized words rather than accidental substrings and excludes drafts", () => {
    const stories = [
      article("climate", {
        title: "Análisis climático",
        summary: "Análisis de datos",
        topics: ["climate"],
      }),
      article("draft", { title: "Análisis climático", status: "draft" }),
      article("unrelated", {
        title: "Conferencia internacional",
        summary: "Otro tema",
        body: "Participan artistas",
        topics: ["culture"],
      }),
    ];
    expect(
      retrieveContext(stories, "analisis climatico", 3).map(
        (item) => item.articleId,
      ),
    ).toEqual(["climate"]);
    expect(retrieveContext(stories, "nacional", 3)).toEqual([]);
  });

  it("caps evidence at three articles even when callers request more", () => {
    const stories = Array.from({ length: 8 }, (_, index) =>
      article(`river-${index}`, {
        title: "Río",
        summary: "Limpieza del río",
        topics: ["environment"],
      }),
    );
    expect(retrieveContext(stories, "rio", 8)).toHaveLength(3);
  });
});
