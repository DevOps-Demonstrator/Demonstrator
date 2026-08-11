import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "on", // Screenshots werden nur aufgenommen und hochgeladen, wenn die Tests fehlschlagen
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      // Backend: FastAPI
      command: "cd .. && uv run uvicorn app.main:app --port 8000",
      port: 8000,
      reuseExistingServer: true,
    },
    {
      // Frontend: Vite Dev Server
      command: "npm run dev -- --port 5173",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
