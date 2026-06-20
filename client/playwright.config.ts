import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the locally running app (client + server).
// Start the app first (e.g. server serving client/dist on 5173, or `npm run dev`).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000, // generous for network-bound steps (e.g. Jenkins log fetch)
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: 'http://il-almaqa-dashboard01.corp.exlibrisgroup.com:5173',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Microsoft Edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
});
