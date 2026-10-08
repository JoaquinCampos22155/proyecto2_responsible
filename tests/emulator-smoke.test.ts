import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { buildSeedArticles } from "../src/demo/seed-data.js";
import type { Article, UserProfile } from "../src/domain/types.js";

const base = "http://127.0.0.1:5001/demo-project2-responsible/us-central1/api";
let app: App;
let token: string;
let uid: string;

beforeAll(async () => {
  app = initializeApp({ projectId: "demo-project2-responsible" }, "smoke");
  for (const article of buildSeedArticles())
    await getFirestore(app).collection("news").doc(article.id).set(article);
  const signUp = async (
    email: string,
    password: string,
  ): Promise<{ idToken: string; localId: string }> => {
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const body = (await response.json()) as {
      idToken?: string;
      localId?: string;
    };
    if (!response.ok || !body.idToken || !body.localId)
      throw new Error("Auth emulator did not issue a test ID token");
    return { idToken: body.idToken, localId: body.localId };
  };
  const body = await signUp("smoke@example.com", "demo-password-123");
  token = body.idToken;
  uid = body.localId;
  const editor = await signUp("editor@demo.test", "local-demo-only");
  await getAuth(app).setCustomUserClaims(editor.localId, { admin: true });
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
    const profile = (await me.json()) as UserProfile;
    expect(profile).toMatchObject({
      uid,
      email: "smoke@example.com",
      simulatedLocation: { country: "GT" },
      interestWeights: {},
    });
    const profileRow = await getFirestore(app)
      .collection("users")
      .doc(profile.uid)
      .get();
    expect(profileRow.exists).toBe(true);
    expect(profileRow.data()).toEqual(profile);
    const feed = await fetch(`${base}/v1/feed?limit=50`, { headers });
    const feedBody = (await feed.json()) as {
      items: Array<{ article: Article }>;
    };
    expect(
      feedBody.items.some((item) => item.article.id.startsWith("demo-")),
    ).toBe(true);
    const seededRiver = buildSeedArticles().find(
      (article) => article.id === "demo-guatemala-river",
    )!;
    const storedRiver = await getFirestore(app)
      .collection("news")
      .doc(seededRiver.id)
      .get();
    expect(storedRiver.data()).toEqual(seededRiver);
    const riverFromFeed = feedBody.items.find(
      (item) => item.article.id === seededRiver.id,
    )?.article;
    expect(riverFromFeed).toMatchObject({
      id: seededRiver.id,
      title: seededRiver.title,
      body: seededRiver.body,
      summary: seededRiver.summary,
      countries: seededRiver.countries,
      regions: seededRiver.regions,
      topics: seededRiver.topics,
      sources: seededRiver.sources,
      image: seededRiver.image,
      editorialPriority: seededRiver.editorialPriority,
      verificationStatus: seededRiver.verificationStatus,
      status: "published",
    });
    const chat = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        question: "What happened in the community cleanup?",
      }),
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
    const usageRows = await getFirestore(app).collection("apiUsage").get();
    expect(
      usageRows.docs.some(
        (row) =>
          row.get("provider") === "mock" &&
          row.get("feature") === "chat" &&
          row.get("estimatedCostUsd") === 0 &&
          row.get("actorUid") === profile.uid,
      ),
    ).toBe(true);
    expect((await fetch(`${base}/v1/admin/usage`, { headers })).status).toBe(
      403,
    );
  });
});
