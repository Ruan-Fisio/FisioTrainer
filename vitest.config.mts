import { defineConfig } from "vitest/config";

/**
 * `npm test` (vitest) só roda os testes unitários de `src/**`. Os specs E2E
 * (`e2e/tests/*.spec.ts`) usam `@playwright/test`, não vitest — sem esse `exclude` o
 * vitest tentaria rodá-los também (o padrão default de include pega `*.spec.ts` também)
 * e quebraria, já que os `test`/`expect` importados lá são de outra lib. Rodar E2E com
 * `npm run test:e2e` (Playwright), não com `npm test`.
 */
export default defineConfig({
  test: {
    exclude: ["node_modules/**", "e2e/**"],
  },
});
