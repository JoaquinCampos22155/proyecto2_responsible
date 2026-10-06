import { describe, expect, it } from "vitest";
import { reasonLabel, evidence, imageLabels } from "./presentation";
describe("Responsible AI presentation", () => {
  it("keeps conflicting evidence distinguishable from a truth verdict", () => {
    expect(evidence.conflicting_sources.description).toMatch(/discrepan/);
    expect(evidence.single_source.description).toMatch(/origen/);
  });
  it("presents interest and geography without ranking numbers", () => {
    expect(reasonLabel("Relevant to your selected region")).toBe(
      "Cerca de tu región",
    );
    expect(reasonLabel("Matches your interest in technology")).toContain(
      "tecnología",
    );
  });
  it("shows both image disclosures when both flags are present", () => {
    expect(
      imageLabels({ generatedByAI: true, alteredByAI: true, provider: "ai" }),
    ).toEqual(["Imagen generada con IA", "Imagen alterada con IA"]);
    expect(
      imageLabels({
        generatedByAI: false,
        alteredByAI: false,
        provider: "pexels",
      }),
    ).toContain("Imagen ilustrativa");
  });
});
