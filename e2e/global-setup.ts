import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Roda uma vez antes de toda a suíte E2E (configurado em `playwright.config.ts`):
 * garante que o banco de teste existe, está migrado e seedado do zero. Ver
 * `e2e/scripts/reset-test-db.ts` — nunca toca no banco de dev.
 */
export default function globalSetup() {
  const script = path.resolve(__dirname, "scripts/reset-test-db.ts");
  execFileSync("npx", ["tsx", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
