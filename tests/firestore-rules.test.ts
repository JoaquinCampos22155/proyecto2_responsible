import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-project2-responsible";
let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "u1"), { uid: "u1", displayName: "Reader" });
    await setDoc(doc(db, "users", "u2"), { uid: "u2", displayName: "Other" });
    await setDoc(doc(db, "news", "published"), {
      status: "published",
      title: "Demo",
    });
    await setDoc(doc(db, "news", "draft"), { status: "draft", title: "Draft" });
    await setDoc(doc(db, "news", "community"), {
      status: "published",
      submittedByUid: "u2",
      title: "Community report",
    });
    await setDoc(doc(db, "apiUsage", "usage1"), { estimatedCostUsd: 1 });
  });
});
afterAll(async () => {
  await environment?.cleanup();
});

describe("Firestore least privilege", () => {
  it("lets readers see published news and their own profile only", async () => {
    const db = environment.authenticatedContext("u1").firestore();
    await assertSucceeds(getDoc(doc(db, "news", "published")));
    await assertSucceeds(getDoc(doc(db, "users", "u1")));
    await assertFails(getDoc(doc(db, "news", "draft")));
    await assertFails(getDoc(doc(db, "news", "community")));
    await assertFails(getDoc(doc(db, "users", "u2")));
  });

  it("does not let a normal user publish, self-promote or inspect cost", async () => {
    const db = environment.authenticatedContext("u1").firestore();
    await assertFails(
      setDoc(doc(db, "news", "published"), {
        status: "published",
        title: "Tampered",
      }),
    );
    await assertFails(setDoc(doc(db, "users", "u1"), { admin: true }));
    await assertFails(getDoc(doc(db, "apiUsage", "usage1")));
  });

  it("lets a claimed admin read drafts and usage while keeping writes on the API", async () => {
    const db = environment
      .authenticatedContext("editor", { admin: true })
      .firestore();
    await assertSucceeds(getDoc(doc(db, "news", "draft")));
    await assertSucceeds(getDoc(doc(db, "apiUsage", "usage1")));
    await assertFails(
      setDoc(doc(db, "news", "draft"), { status: "published" }),
    );
  });

  it("denies unauthenticated reads", async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "news", "published")));
    expect(true).toBe(true);
  });
});

describe("Storage least privilege for community images", () => {
  const submissionId = "123e4567-e89b-12d3-a456-426614174000";
  const imagePath = `user-submissions/u1/${submissionId}/image.jpg`;

  it("allows an owner to upload a small image to their own pending-report path", async () => {
    const storage = environment.authenticatedContext("u1").storage();
    await assertSucceeds(
      storage
        .ref(imagePath)
        .put(new Uint8Array([1, 2, 3]), {
          contentType: "image/jpeg",
        })
        .then(() => undefined),
    );
    await assertFails(
      environment
        .authenticatedContext("u2")
        .storage()
        .ref(imagePath)
        .put(new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" })
        .then(() => undefined),
    );
    await assertFails(
      environment
        .authenticatedContext("u1")
        .storage()
        .ref(`user-submissions/u1/${submissionId}/report.pdf`)
        .put(new Uint8Array([1, 2, 3]), { contentType: "application/pdf" })
        .then(() => undefined),
    );
  });

  it("keeps a pending image private, exposes it after publication, and blocks owner deletion once linked", async () => {
    await environment
      .authenticatedContext("u1")
      .storage()
      .ref(imagePath)
      .put(new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" });
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "news", submissionId), {
        status: "pending_review",
        submittedByUid: "u1",
      });
    });

    await assertSucceeds(
      environment
        .authenticatedContext("u1")
        .storage()
        .ref(imagePath)
        .getMetadata(),
    );
    await assertFails(
      environment
        .authenticatedContext("u2")
        .storage()
        .ref(imagePath)
        .getMetadata(),
    );
    await assertFails(
      environment
        .unauthenticatedContext()
        .storage()
        .ref(imagePath)
        .getMetadata(),
    );
    await assertFails(
      environment.authenticatedContext("u1").storage().ref(imagePath).delete(),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "news", submissionId), {
        status: "published",
        submittedByUid: "u1",
      });
    });
    await assertSucceeds(
      environment
        .unauthenticatedContext()
        .storage()
        .ref(imagePath)
        .getMetadata(),
    );
  });

  it("allows an owner to clean up an upload that was never submitted", async () => {
    const storage = environment.authenticatedContext("u1").storage();
    await storage
      .ref(imagePath)
      .put(new Uint8Array([1, 2, 3]), { contentType: "image/jpeg" });
    await assertSucceeds(storage.ref(imagePath).delete());
  });
});
