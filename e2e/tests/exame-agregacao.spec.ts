import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("agregação (SOMA, MEDIA...) em variáveis e fórmulas", () => {
  test("variável com SOMA da coluna Valor da seção soma todas as entradas", async ({ page }) => {
    const nomeExame = nomeUnico("Exame Agregacao");

    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Medidas");
    await page.getByText("Permitir múltiplas entradas deste campo").last().click();

    const titulosColuna = page.getByPlaceholder("Ex: Nome do membro");
    const tiposColuna = page.locator('select[class*="rounded-lg border"]').filter({
      has: page.locator('option[value="NUMERO"]'),
    });

    await titulosColuna.last().fill("Valor");
    await tiposColuna.last().selectOption("NUMERO");

    // Segundo campo, sem múltiplas entradas: mostra o total.
    await page.getByRole("button", { name: "Adicionar campo" }).last().click();
    await titulosColuna.last().fill("Total");
    await tiposColuna.last().selectOption("CALCULADO");

    // A variável é criada no modal, usando o seletor de cálculo.
    await page
      .getByRole("button", { name: "Abrir editor com autocomplete, variáveis e prévia" })
      .last()
      .click();
    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Nova variável" }).click();
    await modal.getByLabel("Nome da variável").fill("Soma medidas");
    await modal.getByLabel(/^Coluna \(Seção/).selectOption("Medidas > Valor");
    await modal.getByRole("button", { name: "Usar o cálculo acima" }).click();
    await expect(modal.getByLabel("Valor ou fórmula")).toHaveValue("SOMA({Medidas > Valor})");

    await modal.getByLabel("Fórmula", { exact: true }).fill("{Soma medidas} * 2");
    await modal.getByRole("button", { name: "Aplicar" }).click();

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    await page.getByRole("button", { name: "Adicionar entrada" }).filter({ visible: true }).click();
    const valores = page.locator('input[type="number"]:visible');
    await expect(valores).toHaveCount(2);

    await valores.nth(0).fill("10");
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();

    await valores.nth(1).fill("15");
    await expect(page.getByText("50", { exact: true }).filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Avaliação registrada com sucesso.")).toBeVisible();

    await page.getByRole("link", { name: nomeExame }).click();
    await expect(page.getByText("50", { exact: true }).filter({ visible: true })).toBeVisible();
  });
});
