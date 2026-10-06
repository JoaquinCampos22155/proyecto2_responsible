import type { DraftInput, SourceInput } from "../types/domain";
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const list = (form: FormData, key: string) =>
  text(form, key)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export function draftFromForm(form: FormData): DraftInput {
  return {
    title: text(form, "title"),
    body: text(form, "body"),
    summary: text(form, "summary"),
    author: text(form, "author"),
    publisher: text(form, "publisher"),
    canonicalUrl: text(form, "canonicalUrl"),
    scope: text(form, "scope") as DraftInput["scope"],
    countries: list(form, "countries").map((s) => s.toUpperCase()),
    regions: list(form, "regions").map((s) => s.toUpperCase()),
    topics: list(form, "topics").map((s) => s.toLowerCase()),
    editorialPriority: text(
      form,
      "editorialPriority",
    ) as DraftInput["editorialPriority"],
    developing: form.get("developing") === "on",
    aiDisclosure: {
      assisted: form.get("assisted") === "on",
      note: text(form, "aiNote") || null,
    },
  };
}
export function sourceFromForm(form: FormData): SourceInput {
  return {
    name: text(form, "name"),
    publisher: text(form, "publisher"),
    url: text(form, "url"),
    sourceType: text(form, "sourceType") as SourceInput["sourceType"],
    stance: text(form, "stance") as SourceInput["stance"],
    ...(text(form, "originSource")
      ? { originSource: text(form, "originSource") }
      : {}),
    ...(text(form, "sourceGroup")
      ? { sourceGroup: text(form, "sourceGroup") }
      : {}),
    ...(text(form, "credibilityNote")
      ? { credibilityNote: text(form, "credibilityNote") }
      : {}),
  };
}
