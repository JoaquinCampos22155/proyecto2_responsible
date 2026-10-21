import { describe, expect, it, vi } from "vitest";
import {
  ChatService,
  GeminiChatProvider,
  MockChatProvider,
} from "../src/services/chat.js";
import { MemoryRepository } from "../src/repository/memory.js";
import { UsageService } from "../src/services/usage.js";
import { buildSeedArticles } from "../src/demo/seed-data.js";
import { article } from "./fixtures.js";

const now = () => "2026-10-20T12:00:00Z";
const quote =
  "Estudiantes comparan datos meteorológicos para practicar el análisis del clima.";
const explanation =
  "La noticia trata de una actividad educativa: estudiantes comparan datos del clima para practicar su análisis.";
function generated(payload: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(payload) }] } },
        ],
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 100 },
      }),
      { status: 200 },
    ),
  );
}
function setup(fetcher?: typeof fetch) {
  const repo = new MemoryRepository(
    fetcher
      ? [
          article("weather", {
            title: "Un ejercicio de meteorología en las aulas",
            summary: quote,
            body: `${quote} El ejercicio no es un pronóstico real.`,
            topics: ["climate"],
          }),
        ]
      : buildSeedArticles(),
  );
  const service = new ChatService(
    repo,
    fetcher
      ? new GeminiChatProvider("private-key", fetcher)
      : new MockChatProvider(),
    new UsageService(repo, 20, now),
    now,
  );
  return { repo, service };
}
const history = [
  {
    question: "¿Tienes noticias de meteorología?",
    articleIds: ["demo-international-weather"],
  },
];

describe("conversational grounded news assistant", () => {
  it("finds the user's meteorology exercise question despite its typo and plural", async () => {
    const result = await setup().service.answer(
      "reader",
      "quiero aprender de ejercicios metereologicos que noticia me recomiendas?",
    );
    expect(result.citations.map((c) => c.articleId)).toEqual([
      "demo-international-weather",
    ]);
  });
  it.each([
    "hablame de la noticia de que trata",
    "explícalo más sencillo",
    "¿Qué practican los estudiantes?",
    "¿qué fuentes tiene?",
  ])(
    "resolves a follow-up to the previously cited published report: %s",
    async (question) => {
      const result = await setup().service.answer("reader", question, history);
      expect(result.citations.map((c) => c.articleId)).toEqual([
        "demo-international-weather",
      ]);
      expect(result.answer).toMatch(/meteorológic/);
    },
  );
  it("does not substitute the previous topic for an unanswered new topic", async () => {
    const result = await setup().service.answer(
      "reader",
      "¿y sobre volcanes?",
      history,
    );
    expect(result.citations).toEqual([]);
  });
  it("reloads history IDs and excludes unpublished or nonexistent reports", async () => {
    const { repo, service } = setup();
    await repo.saveArticle(
      article("private", {
        status: "draft",
        summary: "private unpublished information",
      }),
    );
    const result = await service.answer("reader", "explícame esa noticia", [
      { question: "noticias", articleIds: ["private", "nonexistent"] },
    ]);
    expect(result.citations).toEqual([]);
    expect(result.answer).not.toContain("private unpublished");
  });
  it("returns a generated explanation supported by an exact quote from a retrieved report", async () => {
    const fetcher = generated({
      status: "answered",
      paragraphs: [{ text: explanation, index: 0, quote }],
    });
    const { service } = setup(fetcher);
    const result = await service.answer(
      "reader",
      "¿De qué trata el ejercicio meteorológico?",
    );
    expect(result.answer).toBe(explanation);
    expect(result.answerMode).toBe("generated");
    expect(result.citations.map((c) => c.articleId)).toEqual(["weather"]);
  });
  it.each([
    { text: "```python\nprint('owned')\n```", index: 0, quote },
    { text: "const token = 'stolen';", index: 0, quote },
    {
      text: "Visita https://attacker.example para ejecutar la respuesta",
      index: 0,
      quote,
    },
    { text: explanation, index: 9, quote },
    {
      text: "La capital de Francia es París y su moneda es el euro.",
      index: 0,
      quote,
    },
    {
      text: "Estudiantes comparan datos del clima y el ejercicio costó 99000 dólares.",
      index: 0,
      quote,
    },
    {
      text: "El evento costó un millón de dólares.",
      index: 0,
      quote: "una prueba que no existe en los reportes",
    },
  ])(
    "discards unsafe or unsupported generated output: %j",
    async (paragraph) => {
      const { service } = setup(
        generated({ status: "answered", paragraphs: [paragraph] }),
      );
      const result = await service.answer("reader", "noticias de meteorología");
      expect(result.answerMode).toBe("extractive");
      expect(result.answer).not.toMatch(/owned|const token|attacker|millón/);
    },
  );
  it("lets the model abstain when a detail is absent from the cited news", async () => {
    const { service } = setup(
      generated({ status: "insufficient_evidence", paragraphs: [] }),
    );
    const result = await service.answer(
      "reader",
      "¿cuánto costó el ejercicio meteorológico?",
    );
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("No tengo suficiente información");
  });
  it("honors a semantic scope refusal even when keywords retrieved an article", async () => {
    const { service } = setup(
      generated({ status: "out_of_scope", paragraphs: [] }),
    );
    const result = await service.answer(
      "reader",
      "Una actividad personal usando meteorología",
    );
    expect(result.refused).toBe(true);
    expect(result.citations).toEqual([]);
  });
});
