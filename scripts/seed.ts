import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { assertProject2Target } from "../src/config.js";
import { buildSeedArticles } from "../src/demo/seed-data.js";

const projectId = assertProject2Target(process.env.FIREBASE_PROJECT_ID ?? "");
const reset = process.argv.includes("--reset");
const app = initializeApp({ projectId });
const db = getFirestore(app);
if (reset) {
  const existing = await db.collection("news").get();
  const demo = existing.docs.filter((doc) => doc.id.startsWith("demo-"));
  for (const doc of demo) await doc.ref.delete();
  process.stdout.write(`Removed ${demo.length} Project 2 demo stories.\n`);
}
const stories = buildSeedArticles(new Date().toISOString());
for (const article of stories)
  await db.collection("news").doc(article.id).set(article);
process.stdout.write(
  `Upserted ${stories.length} synthetic stories into ${projectId}.\n`,
);
