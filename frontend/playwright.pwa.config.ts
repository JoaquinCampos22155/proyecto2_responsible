import { defineConfig } from "@playwright/test";

const baseURL = process.env.PWA_BASE_URL ?? "http://127.0.0.1:4173";
export default defineConfig({
  testDir: "./e2e-pwa",
  workers: 1,
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  ...(process.env.PWA_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run preview",
          url: baseURL,
          reuseExistingServer: false,
        },
      }),
});
