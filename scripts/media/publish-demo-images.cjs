const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PROJECT, operatorFetch } = require("./project2-client.cjs");
const root = path.resolve(__dirname, "../..");
const bucket = PROJECT + "-demo-media";
function value(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: fields(v) } };
}
function fields(v) {
  return Object.fromEntries(Object.entries(v).map(([k, v]) => [k, value(v)]));
}
(async () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "docs/qa/demo-image-prompts.json"), "utf8"),
  );
  const seed = JSON.parse(
    fs.readFileSync(
      path.join(root, "frontend/src/features/sample-news.json"),
      "utf8",
    ),
  );
  if (
    manifest.images.length !== 12 ||
    new Set(manifest.images.map((e) => e.id)).size !== 12 ||
    manifest.images.some(
      (e) => !seed.some((a) => a.id === e.id) || !/^demo-/.test(e.id),
    )
  )
    throw Error("Exactly twelve known demo articles required");
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const originals = [];
  for (const entry of manifest.images) {
    const response = await operatorFetch(base + "/news/" + entry.id);
    const document = await response.json();
    if (!document.fields.title.stringValue.startsWith("[DEMO]"))
      throw Error("Refusing non-demo article");
    originals.push({
      id: entry.id,
      image: document.fields.image,
      updateTime: document.updateTime,
    });
  }
  fs.mkdirSync(path.join(root, ".impeccable"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".impeccable/demo-media-backup.json"),
    JSON.stringify(originals, null, 2),
  );
  const now = new Date().toISOString();
  const writes = [];
  for (const entry of manifest.images) {
    for (const variant of entry.variants) {
      const object = `demo-news/${entry.revision}/${entry.id}-${variant.width}.webp`;
      const boundary = "perspectiva-" + randomUUID();
      const metadata = {
        name: object,
        contentType: "image/webp",
        cacheControl: "public,max-age=31536000,immutable",
        metadata: {
          generatedByAI: "true",
          illustrative: "true",
          articleId: entry.id,
        },
      };
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: image/webp\r\n\r\n`,
        ),
        fs.readFileSync(path.join(root, variant.path)),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      await operatorFetch(
        `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=multipart&predefinedAcl=publicRead`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
      variant.url = `https://storage.googleapis.com/${bucket}/${object}`;
    }
    const primary = entry.variants.find((v) => v.width === 1200).url;
    const image = {
      url: primary,
      provider: "openai-imagegen",
      originalUrl: primary,
      license:
        "Uso ilustrativo en la demo académica; no documenta un hecho real",
      attribution: "Perspectiva · Ilustración generada con IA",
      generatedByAI: true,
      alteredByAI: false,
      retrievedAt: now,
    };
    entry.image = image;
    const original = originals.find((o) => o.id === entry.id);
    writes.push({
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/news/${entry.id}`,
        fields: fields({ image, updatedAt: now }),
      },
      updateMask: { fieldPaths: ["image", "updatedAt"] },
      currentDocument: { updateTime: original.updateTime },
    });
    writes.push({
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/demoImageAssets/${entry.id}`,
        fields: fields({
          articleId: entry.id,
          revision: entry.revision,
          variants: entry.variants.map((variant) => ({
            width: variant.width,
            height: variant.height,
            bytes: variant.bytes,
            url: variant.url,
          })),
          prompt: entry.prompt,
          generator: "built-in image_gen",
          createdAt: now,
          generatedByAI: true,
          illustrative: true,
        }),
      },
    });
    writes.push({
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/audit/demo-image-${entry.id}-${entry.revision}`,
        fields: fields({
          id: `demo-image-${entry.id}-${entry.revision}`,
          articleId: entry.id,
          actorUid: "operator-demo-media",
          action: "edit",
          timestamp: now,
          details: {
            kind: "demo-image-import",
            generatedByAI: true,
            revision: entry.revision,
            operatorWorkflow:
              "User-authorized import of generated illustrations for existing fictional demos",
          },
        }),
      },
    });
    console.log(`Uploaded optimized variants: ${entry.id}`);
  }
  await operatorFetch(base + ":commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  for (const article of seed)
    article.image = manifest.images.find((e) => e.id === article.id).image;
  fs.writeFileSync(
    path.join(root, "frontend/src/features/sample-news.json"),
    JSON.stringify(seed, null, 2),
  );
  fs.writeFileSync(
    path.join(root, "docs/qa/demo-image-prompts.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    JSON.stringify({
      project: PROJECT,
      bucket,
      newsImagesUpdated: 12,
      optimizedFilesUploaded: 36,
      atomicFirestoreWrites: writes.length,
    }),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
