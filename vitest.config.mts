import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * `npm test` (vitest) só roda os testes unitários de `src/**`. Os specs E2E
 * (`e2e/tests/*.spec.ts`) usam `@playwright/test`, não vitest — sem esse `exclude` o
 * vitest tentaria rodá-los também (o padrão default de include pega `*.spec.ts` também)
 * e quebraria, já que os `test`/`expect` importados lá são de outra lib. Rodar E2E com
 * `npm run test:e2e` (Playwright), não com `npm test`.
 */
export default defineConfig({
  resolve: {
    // Mesmo alias "@/*" -> "src/*" do tsconfig.json — sem isso, qualquer módulo de
    // src/lib que importe outro via "@/..." quebra só sob vitest (Next.js/tsc resolvem
    // via tsconfig, mas o vitest usa o resolver do Vite, que não lê tsconfig paths sozinho).
    alias: { "@": path.resolve(dirname, "./src") },
  },
  test: {
    exclude: ["node_modules/**", "e2e/**"],
  },
});
