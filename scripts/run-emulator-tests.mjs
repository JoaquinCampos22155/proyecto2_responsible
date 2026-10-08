import { execFile, spawn } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectId = "demo-project2-responsible";
const emulatorPattern =
  /cloud-firestore-emulator|cloud-storage|firebase-functions|auth-emulator|firebase-database-emulator/i;

async function listEmulatorProcesses() {
  if (process.platform === "win32") {
    const powershell = [
      "$processes = Get-CimInstance Win32_Process",
      `| Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${projectId}') -and $_.CommandLine -match '(?i)(emulator|firebase-functions)' }`,
      "| Select-Object ProcessId,Name,CommandLine",
      "; ConvertTo-Json -InputObject @($processes) -Compress",
    ].join(" ");
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      powershell,
    ]);
    if (!stdout.trim()) return [];
    const rows = JSON.parse(stdout);
    if (!rows) return [];
    return (Array.isArray(rows) ? rows : [rows])
      .filter((row) => row && emulatorPattern.test(row.CommandLine ?? ""))
      .map((row) => Number(row.ProcessId))
      .filter(Number.isInteger);
  }

  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,args="]);
  return stdout
    .split("\n")
    .filter((line) => line.includes(projectId) && emulatorPattern.test(line))
    .map((line) => Number(line.trim().split(/\s+/, 1)[0]))
    .filter(Number.isInteger);
}

async function stopEmulatorProcess(pid) {
  try {
    if (process.platform === "win32") {
      await execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"]);
    } else {
      process.kill(pid, "SIGTERM");
    }
    process.stdout.write(
      `[emulator-cleanup] Stopped local emulator process ${pid}.\n`,
    );
  } catch (error) {
    if (
      error?.code !== "ESRCH" &&
      error?.code !== 128 &&
      !/no se encontró el proceso|not found/i.test(error?.stderr ?? "")
    )
      throw error;
  }
}

const existing = new Set(await listEmulatorProcesses());
const testCommand =
  "npm run test:rules:vitest && npm run test:smoke:vitest && npm --prefix frontend run test:emulator:vitest";
const command = `firebase emulators:exec --project ${projectId} --only auth,firestore,functions,storage "${testCommand}"`;
const child = spawn(command, {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, FRONTEND_EMULATOR_TEST: "1" },
});
const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code) => resolve(code ?? 1));
});

for (const pid of await listEmulatorProcesses()) {
  if (!existing.has(pid)) await stopEmulatorProcess(pid);
}

process.exitCode = exitCode;
