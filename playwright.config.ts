import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: { args: ["--use-angle=swiftshader"] },
  },
  webServer: {
    command:
      process.env.RIGLOOM_PREVIEW === "1"
        ? "npx vite preview --host 127.0.0.1 --port 4173 --strictPort"
        : "npm run dev -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
  reporter: "list",
});
