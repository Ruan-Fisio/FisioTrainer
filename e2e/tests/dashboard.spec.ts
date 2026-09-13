import { test, expect } from "@playwright/test";

test.describe("dashboard", () => {
  test("aba Agenda: chips Hoje/Semana/Mês trocam o período sem erro", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Meus compromissos")).toBeVisible();

    for (const chip of ["Semana", "Mês", "Hoje"]) {
      await page.getByRole("button", { name: chip }).click();
      // Sem agendamentos de teste nesse período, mas a tela não deve quebrar.
      await expect(page.getByText("Meus compromissos")).toBeVisible();
    }
  });

  test("aba Financeiro carrega os KPIs e gráficos sem erro", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("tab", { name: "Financeiro" }).click();

    await expect(page.getByText("Recebido no mês")).toBeVisible();
    await expect(page.getByText("A receber no mês")).toBeVisible();
    await expect(page.getByText("Em atraso", { exact: true })).toBeVisible();
    await expect(page.getByText("Receita por mês")).toBeVisible();
    await expect(page.getByText("Cobranças em atraso")).toBeVisible();
  });
});
