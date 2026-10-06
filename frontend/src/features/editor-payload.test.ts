import { describe, it, expect } from "vitest";
import { draftFromForm, sourceFromForm } from "./editor-payload";
describe("strict editorial request bodies", () => {
  it("normalizes list fields without including server-managed fields", () => {
    const form = new FormData();
    Object.entries({
      title: "A real draft",
      body: "A long enough body",
      canonicalUrl: "https://example.com",
      scope: "local",
      countries: "gt, us",
      regions: "GT-GU",
      topics: "Science, culture",
      editorialPriority: "high",
      id: "forged",
      status: "published",
    }).forEach(([key, value]) => form.set(key, value));
    expect(draftFromForm(form)).toMatchObject({
      countries: ["GT", "US"],
      topics: ["science", "culture"],
      regions: ["GT-GU"],
      editorialPriority: "high",
    });
    expect(draftFromForm(form)).not.toHaveProperty("status");
    expect(draftFromForm(form)).not.toHaveProperty("id");
  });
  it("omits empty optional source origins rather than sending invalid empty strings", () => {
    const form = new FormData();
    Object.entries({
      name: "Source",
      publisher: "Desk",
      url: "https://example.com",
      sourceType: "wire",
      stance: "supports",
      originSource: "",
      sourceGroup: "",
    }).forEach(([key, value]) => form.set(key, value));
    expect(sourceFromForm(form)).toEqual({
      name: "Source",
      publisher: "Desk",
      url: "https://example.com",
      sourceType: "wire",
      stance: "supports",
    });
  });
});
