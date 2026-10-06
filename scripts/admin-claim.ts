import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { assertProject2Target } from "../src/config.js";

const projectId = assertProject2Target(process.env.FIREBASE_PROJECT_ID ?? "");
const uidIndex = process.argv.indexOf("--uid");
const uid = uidIndex >= 0 ? process.argv[uidIndex + 1] : undefined;
const grant = process.argv.includes("--grant");
const revoke = process.argv.includes("--revoke");
if (!uid || grant === revoke)
  throw new Error("Usage: --uid <Firebase Auth UID> --grant|--revoke");
const app = initializeApp({ projectId });
const auth = getAuth(app);
const user = await auth.getUser(uid);
const claims = { ...(user.customClaims ?? {}) };
if (grant) claims.admin = true;
else delete claims.admin;
await auth.setCustomUserClaims(uid, claims);
process.stdout.write(
  `${grant ? "Granted" : "Revoked"} Project 2 admin claim for ${uid}. User must refresh ID token.\n`,
);
