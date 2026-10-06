// @vitest-environment node
import { beforeAll, describe, it, expect } from "vitest";
import { createClient, type Client } from "./client";
let editor: Client, reader: Client;
const base = "http://127.0.0.1:5001/demo-project2-responsible/us-central1/api";
const enabled = process.env.FRONTEND_EMULATOR_TEST === "1";
describe.runIf(enabled)(
  "frontend typed client → Firebase Auth → Functions → Firestore",
  () => {
    beforeAll(async () => {
      const auth = async (path: string, body: object) => {
        const response = await fetch(
          `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${path}?key=demo-key`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const data = (await response.json()) as { idToken: string };
        if (!response.ok)
          throw Error(`Auth emulator returned ${response.status}`);
        return data.idToken;
      };
      const editorToken = await auth("signInWithPassword", {
        email: "editor@demo.test",
        password: "local-demo-only",
        returnSecureToken: true,
      });
      const readerToken = await auth("signUp", {
        email: `reader-${Date.now()}@demo.test`,
        password: "reader-demo-only",
        returnSecureToken: true,
      });
      editor = createClient(base, async () => editorToken);
      reader = createClient(base, async () => readerToken);
    });
    it("retrieves published feed, switches region and records meaningful interests", async () => {
      expect((await reader.me()).uid).toBeTruthy();
      const feed = await reader.feed();
      expect(feed.items.length).toBeGreaterThanOrEqual(12);
      expect(feed.items.some((i) => i.article.scope === "international")).toBe(
        true,
      );
      await reader.location({ country: "US", region: "US-NY" });
      expect((await reader.feed()).items[0].article.id).toBe(
        "demo-new-york-garden",
      );
      const opened = await reader.news("demo-new-york-garden");
      expect(opened.sources.length).toBeGreaterThan(0);
      const event = await reader.event({
        type: "reading_time",
        articleId: opened.id,
        durationSeconds: 45,
      });
      expect(event.profile.interestWeights.environment).toBeGreaterThan(0);
      await expect(reader.adminNews()).rejects.toMatchObject({ status: 403 });
    });
    it("uses grounded citations and a genuine no-evidence response", async () => {
      const answer = await reader.chat("limpieza del río en Guatemala");
      expect(answer.citations.map((c) => c.articleId)).toContain(
        "demo-guatemala-river",
      );
      expect(answer.citations.length).toBeLessThanOrEqual(3);
      expect(answer.uncertainty).toBe("corroborated");
      expect(
        (await reader.chat("quantum banana astrophysics unrelated")).citations,
      ).toHaveLength(0);
    });
    it("completes editorial create/edit/source/assessment/image/publish/archive and actual usage", async () => {
      const draft = await editor.create({
        title: "[DEMO] Frontend integration classroom report",
        body: "This is a fictional frontend integration report, not an actual event.",
        summary: "Synthetic integration test.",
        canonicalUrl: "https://example.com/frontend-integration",
        scope: "local",
        countries: ["GT"],
        regions: ["GT-GU"],
        topics: ["education"],
        editorialPriority: "normal",
      });
      expect(draft.status).toBe("draft");
      await expect(reader.news(draft.id)).rejects.toMatchObject({
        status: 404,
      });
      const edited = await editor.edit(draft.id, {
        summary: "Updated synthetic integration summary",
      });
      expect(edited.summary).toBe("Updated synthetic integration summary");
      await editor.source(draft.id, {
        name: "Synthetic classroom source",
        url: "https://example.com/source-one",
        publisher: "Demo Classroom Desk",
        sourceType: "report",
        stance: "supports",
        originSource: "Demo Origin One",
        sourceGroup: "Demo Group One",
      });
      await editor.source(draft.id, {
        name: "Second synthetic source",
        url: "https://example.com/source-two",
        publisher: "Demo Independent Desk",
        sourceType: "official",
        stance: "supports",
        originSource: "Demo Origin Two",
        sourceGroup: "Demo Group Two",
      });
      expect((await editor.assess(draft.id)).verificationStatus).toBe(
        "corroborated",
      );
      const images = await editor.images("education");
      expect(images.images.length).toBeGreaterThan(0);
      expect(
        (await editor.image(draft.id, images.images[0])).image?.provider,
      ).toBe("mock-stock");
      expect((await editor.image(draft.id, null)).image).toBeNull();
      const published = await editor.publish(draft.id);
      expect(published.humanReview?.reviewedBy).toBeTruthy();
      expect((await reader.news(draft.id)).status).toBe("published");
      expect((await editor.archive(draft.id)).status).toBe("archived");
      await expect(reader.news(draft.id)).rejects.toMatchObject({
        status: 404,
      });
      const audit = await editor.audit(draft.id);
      expect(audit.items.map((record) => record.action)).toEqual(
        expect.arrayContaining([
          "create",
          "edit",
          "assess",
          "publish",
          "archive",
        ]),
      );
      const usage = await editor.usage();
      expect(usage.totalUsd).toBe(0);
      expect(usage.remainingUsd).toBe(20);
    });
  },
);
