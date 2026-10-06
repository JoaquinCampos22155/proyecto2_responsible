const allowedProjects = new Set([
  "proyecto2responsibleai",
  "demo-project2-responsible",
]);
export function assertProject2Target(projectId: string): string {
  if (!allowedProjects.has(projectId))
    throw new Error(
      `Refusing non-Project-2 Firebase target: ${projectId || "(missing)"}`,
    );
  return projectId;
}
export function parseRuntimeConfig(environment: NodeJS.ProcessEnv): {
  projectId: string;
  budgetUsd: number;
  allowedOrigins: string[];
  aiProvider: "mock" | "gemini";
  geminiApiKey: string | null;
  imageProvider: "mock-stock" | "pexels";
  pexelsApiKey: string | null;
} {
  const emulator = Boolean(
    environment.FIRESTORE_EMULATOR_HOST ||
    environment.FIREBASE_AUTH_EMULATOR_HOST,
  );
  const selectedProject = emulator
    ? (environment.GCLOUD_PROJECT ?? environment.FIREBASE_PROJECT_ID)
    : (environment.FIREBASE_PROJECT_ID ?? environment.GCLOUD_PROJECT);
  const projectId = assertProject2Target(selectedProject ?? "");
  const budgetUsd = Number(environment.AI_BUDGET_USD ?? "20");
  if (!Number.isFinite(budgetUsd) || budgetUsd < 0)
    throw new Error("AI_BUDGET_USD must be nonnegative");
  const aiProvider = environment.AI_PROVIDER ?? "mock";
  if (aiProvider !== "mock" && aiProvider !== "gemini")
    throw new Error("AI_PROVIDER must be mock or gemini");
  if (aiProvider === "gemini" && !environment.GEMINI_API_KEY?.trim())
    throw new Error("GEMINI_API_KEY required for Gemini");
  const imageProvider = environment.IMAGE_PROVIDER ?? "mock-stock";
  if (imageProvider !== "mock-stock" && imageProvider !== "pexels")
    throw new Error("IMAGE_PROVIDER must be mock-stock or pexels");
  if (imageProvider === "pexels" && !environment.PEXELS_API_KEY?.trim())
    throw new Error("PEXELS_API_KEY required for Pexels");
  const allowedOrigins = (environment.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin)))
    throw new Error("CORS_ORIGINS must contain HTTP(S) origins");
  return {
    projectId,
    budgetUsd,
    allowedOrigins,
    aiProvider,
    geminiApiKey: environment.GEMINI_API_KEY?.trim() ?? null,
    imageProvider,
    pexelsApiKey: environment.PEXELS_API_KEY?.trim() ?? null,
  };
}
