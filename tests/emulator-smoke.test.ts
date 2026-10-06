import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildSeedArticles } from "../src/demo/seed-data.js";

const base = "http://127.0.0.1:5001/demo-project2-responsible/us-central1/api";
let app: App;
let token: string;

beforeAll(async () => {
  app = initializeApp({ projectId: "demo-project2-responsible" }, "smoke");
  for (const article of buildSeedArticles())
    await getFirestore(app).collection("news").doc(article.id).set(article);
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoke@example.com",
        password: "demo-password-123",
        returnSecureToken: true,
      }),
    },
  );
  const body = (await response.json()) as { idToken?: string };
  if (!response.ok || !body.idToken)
    throw new Error("Auth emulator did not issue a test ID token");
  token = body.idToken;
});
afterAll(async () => {
  await deleteApp(app);
});

describe("Functions + Auth + Firestore emulator", () => {
  it("responds to health and rejects an unauthenticated profile request", async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect((await fetch(`${base}/v1/me`)).status).toBe(401);
  });

  it("verifies an emulator ID token and serves seeded feed and grounded chat", async () => {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const me = await fetch(`${base}/v1/me`, { headers });
    expect(me.status).toBe(200);
    const feed = await fetch(`${base}/v1/feed?limit=4`, { headers });
    const feedBody = (await feed.json()) as {
      items: Array<{ article: { id: string } }>;
    };
    expect(
      feedBody.items.some((item) => item.article.id.startsWith("demo-")),
    ).toBe(true);
    const chat = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question: "What is the river cleanup?" }),
    });
    const chatBody = (await chat.json()) as {
      citations: Array<{ articleId: string }>;
      providerMode: string;
    };
    expect(chat.status).toBe(200);
    expect(
      chatBody.citations.some(
        (citation) => citation.articleId === "demo-guatemala-river",
      ),
    ).toBe(true);
    expect(chatBody.providerMode).toBe("mock");
    expect((await fetch(`${base}/v1/admin/usage`, { headers })).status).toBe(
      403,
    );
  });
});
