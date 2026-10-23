import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("tabela de referência do exame — cadastro e execução", () => {
  test("{Tabela.Resultado} escolhe a linha pela faixa da coluna Peso e alimenta uma coluna calculada", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Tabela");

    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Dados");

    const titulosColuna = page.getByPlaceholder("Ex: Nome do membro");
    const tiposColuna = page.locator('select[class*="rounded-lg border"]').filter({
      has: page.locator('option[value="NUMERO"]'),
    });

    await titulosColuna.last().fill("Peso");
    await tiposColuna.last().selectOption("NUMERO");

    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("Resultado");
    await tiposColuna.last().selectOption("CALCULADO");
    await page
      .getByPlaceholder("Ex: {Peso} / ({Altura} * {Altura})")
      .last()
      .fill("{Ref.Fator} * 10");

    // Tabela "Ref" (modal com grade): chave Peso -> resultado Fator, duas linhas.
    await page.getByRole("button", { name: "Adicionar tabela" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Nome da tabela").fill("Ref");
    await modal.getByLabel("Chave 1").fill("Peso");
    await modal.getByLabel("Resultado 1").fill("Fator");

    await modal.getByLabel("Peso de (linha 1)").fill("40");
    await modal.getByLabel("Peso até (linha 1)").fill("79.9");
    await modal.getByLabel("Fator (linha 1)").fill("1");

    await modal.getByRole("button", { name: "Adicionar linha" }).click();
    await modal.getByLabel("Peso de (linha 2)").fill("80");
    await modal.getByLabel("Peso até (linha 2)").fill("200");
    await modal.getByLabel("Fator (linha 2)").fill("2");
    await modal.getByRole("button", { name: "Salvar tabela" }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByText("{Ref.Fator}")).toBeVisible();

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    const pesoInput = page.locator('input[type="number"]:visible').nth(0);

    await pesoInput.fill("90");
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();

    await pesoInput.fill("60");
    await expect(page.getByText("10", { exact: true }).filter({ visible: true })).toBeVisible();

    // Fora de todas as faixas: erro no campo, nunca um valor inventado.
    await pesoInput.fill("30");
    await expect(page.getByText(/divisão por zero/).filter({ visible: true })).toBeVisible();

    await pesoInput.fill("90");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Avaliação registrada com sucesso.")).toBeVisible();

    // O detalhe recalcula a partir da tabela salva.
    await page.getByRole("link", { name: nomeExame }).click();
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test("modal da tabela não salva com resultado sem número", async ({ page }) => {
    await page.goto("/exames/novo");
    await page.getByRole("button", { name: "Adicionar tabela" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Salvar tabela" }).click();
    await expect(modal.getByText(/preencha um número/)).toBeVisible();
    await expect(modal).toBeVisible();

    // Cancelar descarta a tabela nova.
    await modal.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  });
});
