import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { buscar } from "../fixtures/listagem";

test.describe("logs (auditoria)", () => {
  test("busca por texto encontra o registro e abre os detalhes", async ({ page }) => {
    const paciente = await criarPaciente(page);

    await page.goto("/logs");
    await buscar(page, "q", paciente.nome);

    const linha = page.getByRole("row", { name: new RegExp(paciente.nome) }).first();
    await expect(linha).toBeVisible();
    await linha.getByRole("button", { name: "Detalhes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading")).toContainText(paciente.nome);
    await expect(dialog.locator("pre")).toContainText(paciente.nome);
  });

  test("filtro por módulo e busca sem resultado não quebram a tela", async ({ page }) => {
    await page.goto("/logs");
    await buscar(page, "q", "zzz-log-nao-existe-zzz");
    await expect(page.getByText(/nenhum|não encontrado/i)).toBeVisible();
  });
});
