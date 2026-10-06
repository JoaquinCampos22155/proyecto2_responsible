import { describe, expect, it, vi } from "vitest";
import { GeminiChatProvider } from "../src/services/chat.js";
import { PexelsImageProvider } from "../src/services/images.js";
import { ChatService } from "../src/services/chat.js";
import { UsageService } from "../src/services/usage.js";
import { MemoryRepository } from "../src/repository/memory.js";
import { article } from "./fixtures.js";
import { buildSeedArticles } from "../src/demo/seed-data.js";
import { retrieveContext } from "../src/domain/retrieval.js";

const now = () => "2026-09-26T12:00:00.000Z";

describe("live provider boundaries", () => {
  it("does not cite weakly related stories for a specific question", () => {
    const context = retrieveContext(
      buildSeedArticles(),
      "¿Qué pasó en la limpieza del río de Ciudad de Guatemala?",
      3,
    );
    expect(context.map((item) => item.articleId)).toEqual([
      "demo-guatemala-river",
    ]);
  });
  it("grounds Gemini chat in retrieved articles and records measured token cost", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher: typeof fetch = vi.fn(async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Según la noticia, comenzó una limpieza del río." },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const repo = new MemoryRepository([
      article("river", {
        title: "River cleanup",
        summary: "A classroom cleanup began.",
      }),
    ]);
    const service = new ChatService(
      repo,
      new GeminiChatProvider("test-key", fetcher),
      new UsageService(repo, 20, now),
      now,
    );
    const result = await service.answer(
      "user-1",
      "What happened in the river cleanup?",
    );
    expect(result.providerMode).toBe("gemini");
    expect(result.answer).toContain("comenzó una limpieza");
    expect(result.citations.map((item) => item.articleId)).toEqual(["river"]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toContain("gemini-3.5-flash-lite:generateContent");
    expect(
      (requests[0]?.init.headers as Record<string, string>)["x-goog-api-key"],
    ).toBe("test-key");
    const payload = JSON.parse(String(requests[0]?.init.body));
    expect(payload.systemInstruction.parts[0].text).toContain(
      "Responde en español",
    );
    expect(payload.contents[0].parts[0].text).toContain("Noticia 1:");
    expect(payload.contents[0].parts[0].text).toContain(
      "A classroom cleanup began.",
    );
    expect(payload.contents[0].parts[0].text).not.toContain('[{"articleId"');
    expect(payload.generationConfig.maxOutputTokens).toBeLessThanOrEqual(256);
    const usage = await repo.listUsage();
    expect(usage[0]).toMatchObject({
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      inputTokens: 100,
      outputTokens: 20,
      estimatedCostUsd: 0.00008,
    });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("does not call Gemini when published news has no relevant context", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const repo = new MemoryRepository();
    const service = new ChatService(
      repo,
      new GeminiChatProvider("test-key", fetcher),
      new UsageService(repo, 20, now),
      now,
    );
    const result = await service.answer(
      "user-1",
      "What happened to the river?",
    );
    expect(result.uncertainty).toBe("unverified");
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("No tengo suficiente información");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("checks budget before sending a paid Gemini request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const repo = new MemoryRepository([
      article("river", { title: "River cleanup" }),
    ]);
    const service = new ChatService(
      repo,
      new GeminiChatProvider("test-key", fetcher),
      new UsageService(repo, 0, now),
      now,
    );
    await expect(
      service.answer("user-1", "River cleanup?"),
    ).rejects.toMatchObject({ code: "BUDGET_EXCEEDED" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps Pexels photos into usable stock candidates with source credit", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetcher: typeof fetch = vi.fn(async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          photos: [
            {
              id: 123,
              url: "https://www.pexels.com/photo/river-123/",
              photographer: "Example Artist",
              photographer_url: "https://www.pexels.com/@example/",
              src: {
                original: "https://images.pexels.com/photos/123/original.jpeg",
                landscape:
                  "https://images.pexels.com/photos/123/landscape.jpeg",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const result = await new PexelsImageProvider("test-key", fetcher).search(
      "river cleanup",
      now(),
    );
    expect(requests[0]?.url).toBe(
      "https://api.pexels.com/v1/search?query=river+cleanup&per_page=5",
    );
    expect(
      (requests[0]?.init.headers as Record<string, string>).Authorization,
    ).toBe("test-key");
    expect(result[0]).toMatchObject({
      provider: "pexels",
      url: "https://images.pexels.com/photos/123/landscape.jpeg",
      originalUrl: "https://images.pexels.com/photos/123/original.jpeg",
      sourcePageUrl: "https://www.pexels.com/photo/river-123/",
      attribution: "Photo by Example Artist on Pexels",
      generatedByAI: false,
      alteredByAI: false,
    });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });

  it("reports upstream errors without leaking the Pexels key", async () => {
    const fetcher: typeof fetch = vi.fn(
      async () => new Response("bad token test-key", { status: 401 }),
    );
    await expect(
      new PexelsImageProvider("test-key", fetcher).search("river", now()),
    ).rejects.toMatchObject({ code: "IMAGE_PROVIDER_ERROR", status: 502 });
  });
});
