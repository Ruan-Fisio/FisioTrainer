import { test, expect } from "@playwright/test";
import { ADMIN } from "../fixtures/usuarios";

test.describe("autenticação", () => {
  // Este spec começa sem sessão — não usa o storageState do projeto "chromium".
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redireciona pra /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("mostra erro com senha errada", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("loga com credenciais válidas e chega no dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Senha").fill(ADMIN.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Meus compromissos")).toBeVisible();
  });
});

test.describe("sessão autenticada (storageState)", () => {
  test("acessa o dashboard direto, sem passar pelo login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Meus compromissos")).toBeVisible();
  });
});
