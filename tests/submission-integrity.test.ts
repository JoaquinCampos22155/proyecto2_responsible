import { describe, expect, it } from "vitest";
import { MemoryRepository } from "../src/repository/memory.js";
import { NewsService } from "../src/services/news.js";
const now = () => "2026-10-12T12:00:00.000Z";
const submission = {
  submissionId: "123e4567-e89b-12d3-a456-426614174000",
  title: "Una iniciativa comunitaria anuncia nuevas actividades",
  summary: "El grupo local anunció nuevas actividades para este fin de semana.",
  body: "El grupo comunitario compartió un reporte detallado con fechas, lugar y participantes.",
  originDate: "2026-10-12",
  scope: "national",
  country: "GT",
  topics: ["community"],
  source: {
    name: "Anuncio",
    publisher: "Medio Comunitario",
    url: "https://community.example/report",
    sourceType: "news",
    stance: "supports",
  },
};
describe("submission integrity", () => {
  it("never overwrites another owner's concurrent submission", async () => {
    const repo = new MemoryRepository();
    const service = new NewsService(repo, now);
    // Both requests observe absence before either writes, reproducing the race.
    repo.getArticle = async () => null;
    const results = await Promise.allSettled([
      service.submit(submission, { uid: "first", name: "First" }),
      service.submit(submission, { uid: "second", name: "Second" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "CONFLICT", status: 409 });
    expect((await repo.listArticles())[0]?.submittedByUid).toBe("first");
  });
});
