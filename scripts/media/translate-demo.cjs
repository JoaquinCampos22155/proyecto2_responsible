// Patch only the display content of known synthetic articles; retain media and review.
const fs = require("node:fs");
const { isDeepStrictEqual } = require("node:util");
const { PROJECT, operatorFetch } = require("./project2-client.cjs");
const seed = JSON.parse(
  fs.readFileSync("frontend/src/features/sample-news.json", "utf8"),
);
const keys = [
  "title",
  "summary",
  "body",
  "author",
  "publisher",
  "topics",
  "sources",
];
function value(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, value(x)]),
      ),
    },
  };
}
(async () => {
  if (
    seed.length !== 12 ||
    seed.some((a) => !a.id.startsWith("demo-") || !a.title.startsWith("[DEMO]"))
  )
    throw Error("Known demo articles required");
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const originals = [];
  const writes = [];
  for (const article of seed) {
    const doc = await (
      await operatorFetch(`${base}/news/${article.id}`)
    ).json();
    if (!doc.fields.title.stringValue.startsWith("[DEMO]"))
      throw Error("Not a demo article");
    originals.push(doc);
    const fields = Object.fromEntries(keys.map((k) => [k, value(article[k])]));
    writes.push({
      update: { name: doc.name, fields },
      updateMask: { fieldPaths: keys },
      currentDocument: { updateTime: doc.updateTime },
    });
  }
  fs.writeFileSync(
    ".impeccable/demo-translation-backup.local",
    JSON.stringify(originals, null, 2),
    { mode: 0o600 },
  );
  await operatorFetch(`${base}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  for (const article of seed) {
    const doc = await (
      await operatorFetch(`${base}/news/${article.id}`)
    ).json();
    const prior = originals.find((d) => d.name === doc.name);
    if (
      doc.fields.title.stringValue !== article.title ||
      !isDeepStrictEqual(doc.fields.image, prior.fields.image) ||
      !isDeepStrictEqual(doc.fields.humanReview, prior.fields.humanReview) ||
      !isDeepStrictEqual(doc.fields.publishedAt, prior.fields.publishedAt)
    )
      throw Error("Readback mismatch");
  }
  console.log(
    "Translated 12 production demo articles; images, review and publication times preserved.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
