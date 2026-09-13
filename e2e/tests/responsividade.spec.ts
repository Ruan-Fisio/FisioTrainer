import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";

/**
 * Regra do `CLAUDE.md`: listagens mostram cards em mobile / tabela em desktop — nunca só
 * a tabela com scroll horizontal como única opção em telas pequenas, e abas nunca em
 * scroll horizontal em mobile (grade de botões em vez de `TabsList` tradicional).
 */
test.describe("responsividade (mobile ~375px)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("listagem de pacientes usa cards, não tabela, no mobile", async ({ page }) => {
    const paciente = await criarPaciente(page);
    await page.goto("/pacientes");

    await expect(page.locator("table")).toBeHidden();
    // O card do paciente (fora da tabela) está visível e continua acionável — `.first()`
    // porque o mesmo nome existe 2x no DOM (card mobile + linha desktop), só o
    // primeiro (o card) fica visível nesse viewport.
    await expect(page.getByText(paciente.nome, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar" }).first()).toBeVisible();
  });

  test("listagem de planos usa cards, não tabela, no mobile", async ({ page }) => {
    await page.goto("/planos");
    await expect(page.locator("table")).toBeHidden();
  });

  test("abas do paciente viram grade de botões, sem scroll horizontal", async ({ page }) => {
    const paciente = await criarPaciente(page);
    await page.goto(`/pacientes/${paciente.id}`);

    // A `TabsList` tradicional (desktop) das abas do paciente fica escondida; no lugar,
    // uma grade de botões. (Há outro `tablist` na página — o de Fisioterapia/Educação
    // Física dentro de Avaliações — por isso o filtro pela aba "Planos".)
    const tablistPaciente = page
      .getByRole("tablist")
      .filter({ has: page.getByRole("tab", { name: "Planos" }) });
    await expect(tablistPaciente).toBeHidden();
    await expect(page.getByRole("button", { name: "Planos" })).toBeVisible();

    // Sem overflow horizontal na página inteira.
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowX).toBe(false);
  });
});
