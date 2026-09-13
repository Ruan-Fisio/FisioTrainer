import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./e2e/test-db";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * Suíte E2E do FisioTrainer. Roda contra um banco de teste isolado
 * (`e2e/test-db.ts` / `e2e/scripts/reset-test-db.ts`), nunca o banco de dev, numa porta
 * própria (3100) pra não colidir com um `npm run dev` já aberto na 3000.
 *
 * Ver seção "Testes E2E (Playwright)" no `CLAUDE.md`.
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limitado (não o default por núcleo de CPU): cada teste sobe páginas pesadas (RSC +
  // Prisma) contra um único `next dev` + pool de conexão do Postgres — com paralelismo
  // demais o servidor de dev derruba conexão sob carga (ECONNRESET/timeout), não por bug
  // de teste. 2 workers é o que se mostrou estável com a suíte inteira.
  workers: 2,
  reporter: process.env.CI ? "github" : "html",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      // Isola o build do servidor E2E do seu `npm run dev` normal (mesmo diretório de
      // projeto) — sem isso o Next recusa subir um 2º dev server. Ver `next.config.ts`.
      NEXT_DIST_DIR: ".next-e2e",
      // Sobrescreve o `.env` real (que aponta pra porta 3000) — sem isso, qualquer link
      // absoluto gerado pelo app (ex. "Compartilhar acesso" do paciente) manda o teste
      // pro seu `npm run dev` de verdade em vez do servidor E2E isolado.
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
