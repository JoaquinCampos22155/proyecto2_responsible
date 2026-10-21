import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import { setTimeout } from "node:timers";

const execFileAsync = promisify(execFile);
const testCommand =
  "npm run test:rules:vitest && npm run test:smoke:vitest && npm --prefix frontend run test:emulator:vitest && npm --prefix frontend run test:e2e -- --grep 'chat conectado|editor conectado'";
// A dedicated process group proves ownership even if Java outlives the CLI.
// Never discover or terminate processes by emulator name or project name.
const child = spawn(
  process.execPath,
  [
    "node_modules/firebase-tools/lib/bin/firebase.js",
    "emulators:exec",
    "--project",
    "demo-project2-responsible",
    "--only",
    "auth,firestore,functions,storage",
    testCommand,
  ],
  {
    detached: process.platform !== "win32",
    stdio: "inherit",
    env: { ...process.env, FRONTEND_EMULATOR_TEST: "1" },
  },
);
const groupId = child.pid;
async function cleanup() {
  if (!groupId) return;
  if (process.platform === "win32") {
    // Target only the child tree started above, never another running emulator.
    if (child.exitCode === null) {
      await execFileAsync("taskkill.exe", [
        "/PID",
        String(groupId),
        "/T",
      ]).catch(() => {});
    }
    return;
  }
  const exists = () => {
    try {
      process.kill(-groupId, 0);
      return true;
    } catch (error) {
      if (error.code === "ESRCH") return false;
      throw error;
    }
  };
  if (!exists()) return;
  process.kill(-groupId, "SIGTERM");
  for (let attempt = 0; attempt < 20 && exists(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (exists()) {
    process.kill(-groupId, "SIGKILL");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (exists())
    throw new Error(`Task-owned emulator group ${groupId} remains running`);
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}
try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
} finally {
  await cleanup();
}
