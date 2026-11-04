import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("coluna calculada (fórmula) — cadastro e execução", () => {
  test("IMC calculado a partir de Peso/Altura, ao vivo na execução e no detalhe salvo", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Calculado");

    // Cadastra o exame com 3 colunas no mesmo campo: Peso e Altura (Número) e
    // IMC (Calculado), referenciando as duas pelo nome.
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
    await titulosColuna.last().fill("Altura");
    await tiposColuna.last().selectOption("NUMERO");

    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("IMC");
    await tiposColuna.last().selectOption("CALCULADO");

    const formula = page
      .getByPlaceholder("Ex: {Peso} / ({Altura} * {Altura})")
      .last();
    await expect(formula).toBeVisible();

    // Os botões com o nome das colunas ficam no modal do editor.
    await page.getByRole("button", { name: "Abrir editor" }).last().click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByRole("button", { name: "Peso", exact: true })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Altura", exact: true })).toBeVisible();
    await modal.getByRole("button", { name: "Cancelar" }).click();
    await formula.fill("{Peso}/({Altura}*{Altura})");

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    // Nova avaliação: o campo IMC nunca é editável e recalcula a cada tecla.
    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    await expect(
      page
        .getByText("Preencha Peso e Altura para calcular")
        .filter({ visible: true }),
    ).toBeVisible();

    const pesoInput = page.locator('input[type="number"]:visible').nth(0);
    const alturaInput = page.locator('input[type="number"]:visible').nth(1);

    await pesoInput.fill("70");
    await expect(
      page.getByText("Preencha Altura para calcular").filter({ visible: true }),
    ).toBeVisible();

    await alturaInput.fill("1.75");
    await expect(
      page.getByText("22.9", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    // Nunca vira um <input> editável — não deve haver nenhum campo de texto/número
    // para IMC, só a caixa somente-leitura já verificada acima.
    await expect(page.getByRole("textbox", { name: "IMC" })).toHaveCount(0);

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.getByText("Avaliação registrada com sucesso."),
    ).toBeVisible();

    // O valor calculado nunca é gravado — é recomputado ao abrir o detalhe,
    // a partir dos valores reais salvos de Peso/Altura.
    await page.getByRole("link", { name: nomeExame }).click();
    await expect(
      page.getByText("22.9", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  });
});
