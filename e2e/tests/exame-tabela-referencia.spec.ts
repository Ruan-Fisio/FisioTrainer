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

    // Tabela "Ref": chave Peso → resultado Fator, duas linhas.
    await page.getByRole("button", { name: /Tabelas de referência/ }).click();
    await page.getByRole("button", { name: "Adicionar tabela" }).click();
    await page.getByLabel("Nome da tabela").fill("Ref");
    await page.getByLabel("Chave 1").fill("Peso");
    await page.getByLabel("Resultado 1").fill("Fator");

    await page.getByLabel("Peso de", { exact: true }).nth(0).fill("40");
    await page.getByLabel("Peso até", { exact: true }).nth(0).fill("79.9");
    await page.getByLabel("Fator", { exact: true }).nth(0).fill("1");

    await page.getByRole("button", { name: "Adicionar linha" }).click();
    await page.getByLabel("Peso de", { exact: true }).nth(1).fill("80");
    await page.getByLabel("Peso até", { exact: true }).nth(1).fill("200");
    await page.getByLabel("Fator", { exact: true }).nth(1).fill("2");

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

  test("tabela com resultado sem número barra o salvamento e leva até a tabela", async ({ page }) => {
    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeUnico("Exame Tabela Erro"));
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Dados");
    await page.getByPlaceholder("Ex: Nome do membro").last().fill("Peso");

    await page.getByRole("button", { name: /Tabelas de referência/ }).click();
    await page.getByRole("button", { name: "Adicionar tabela" }).click();
    await page.getByLabel("Chave 1").fill("Peso");

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText(/preencha um número/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/exames\/novo/);
  });
});
