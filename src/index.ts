import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Express } from "express";
import { createApp } from "./api/app.js";
import { parseRuntimeConfig } from "./config.js";
import { FirestoreRepository } from "./repository/firestore.js";
import { GeminiChatProvider } from "./services/chat.js";
import { PexelsImageProvider } from "./services/images.js";

let app: Express | undefined;
const geminiApiKey = defineSecret("GEMINI_API_KEY");
export const api = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    maxInstances: 2,
    cors: false,
    secrets: [geminiApiKey],
  },
  (request, response) => {
    if (!app) {
      const config = parseRuntimeConfig(process.env);
      if (getApps().length === 0)
        initializeApp({ projectId: config.projectId });
      const auth = getAuth();
      app = createApp({
        repo: new FirestoreRepository(getFirestore()),
        now: () => new Date().toISOString(),
        budgetUsd: config.budgetUsd,
        allowedOrigins: config.allowedOrigins,
        chatProvider:
          config.aiProvider === "gemini"
            ? new GeminiChatProvider(config.geminiApiKey!)
            : undefined,
        imageProvider:
          config.imageProvider === "pexels"
            ? new PexelsImageProvider(config.pexelsApiKey!)
            : undefined,
        verifyToken: async (token) => {
          const decoded = await auth.verifyIdToken(token);
          return {
            uid: decoded.uid,
            admin: decoded.admin === true,
            name: typeof decoded.name === "string" ? decoded.name : null,
            email: typeof decoded.email === "string" ? decoded.email : null,
            picture:
              typeof decoded.picture === "string" ? decoded.picture : null,
          };
        },
      });
    }
    app(request, response);
  },
);
