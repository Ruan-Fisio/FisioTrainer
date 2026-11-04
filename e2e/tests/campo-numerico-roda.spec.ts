import { expect, test } from "@playwright/test";

test("roda do mouse não altera campo numérico focado", async ({ page }) => {
  await page.goto("/planos/novo");

  const campo = page.locator("#atendimentos");
  await campo.fill("5");
  await campo.hover();

  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);

  await expect(campo).toHaveValue("5");
});
