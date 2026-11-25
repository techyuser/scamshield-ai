import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:3058",
    headless: true,
  },
  webServer: {
    command: "pnpm exec next start -p 3058 -H 127.0.0.1",
    url: "http://127.0.0.1:3058/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
