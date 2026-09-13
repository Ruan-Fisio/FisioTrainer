import { test as setup, expect } from "@playwright/test";
import { ADMIN } from "../fixtures/usuarios";

const ARQUIVO_STORAGE_STATE = "e2e/.auth/admin.json";

/**
 * Roda uma vez (projeto "setup" em `playwright.config.ts`) antes dos specs: loga como
 * admin pela UI de verdade e salva a sessão, pra todo spec reusar sem logar de novo.
 */
setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.senha);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: ARQUIVO_STORAGE_STATE });
});
