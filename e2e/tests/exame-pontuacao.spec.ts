import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("pontuação por opção de múltipla escolha — cadastro e execução", () => {
  test("{Soma pontuações} soma as colunas de pontuação marcadas, ao vivo e no detalhe", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Pontuacao");

    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Questionário");

    const titulosColuna = page.getByPlaceholder("Ex: Nome do membro");
    const tiposColuna = page.locator('select[class*="rounded-lg border"]').filter({
      has: page.locator('option[value="NUMERO"]'),
    });
    const togglePontuacao = page.getByText(
      /Esta coluna funciona como pontuação/,
    );

    // Q1: Leve = 1, Grave = 3
    await titulosColuna.last().fill("Dor");
    await tiposColuna.last().selectOption("MULTIPLA_ESCOLHA");
    await page.getByPlaceholder("Opção 1").last().fill("Leve");
    await page.getByPlaceholder("Opção 2").last().fill("Grave");
    await togglePontuacao.last().click();
    await page.getByLabel("Pontos").filter({ visible: true }).nth(0).fill("1");
    await page.getByLabel("Pontos").filter({ visible: true }).nth(1).fill("3");

    // Q2: Baixo = 2, Alto = 5 (vírgula decimal também é aceita no campo)
    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("Rigidez");
    await tiposColuna.last().selectOption("MULTIPLA_ESCOLHA");
    await page.getByPlaceholder("Opção 1").last().fill("Baixo");
    await page.getByPlaceholder("Opção 2").last().fill("Alto");
    await togglePontuacao.last().click();
    await page.getByLabel("Pontos").filter({ visible: true }).nth(2).fill("2");
    await page.getByLabel("Pontos").filter({ visible: true }).nth(3).fill("5,5");

    // Total = {Soma pontuações}: soma global das colunas marcadas como pontuação.
    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("Total");
    await tiposColuna.last().selectOption("CALCULADO");
    await page
      .getByRole("button", { name: "Soma pontuações (exame)" })
      .last()
      .click();
    await expect(
      page.getByPlaceholder("Ex: {Peso} / ({Altura} * {Altura})").last(),
    ).toHaveValue("{Soma pontuações}");

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    // Nada marcado = sem valor.
    await expect(
      page
        .getByText("Preencha Soma pontuações para calcular")
        .filter({ visible: true }),
    ).toBeVisible();

    // Soma só das respondidas: com uma coluna marcada já aparece o parcial.
    await page.getByText("Grave", { exact: false }).filter({ visible: true }).first().click();
    await expect(
      page.getByText("3", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    await page.getByText("Alto", { exact: false }).filter({ visible: true }).first().click();
    // 3 + 5,5
    await expect(
      page.getByText("8.5", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.getByText("Avaliação registrada com sucesso."),
    ).toBeVisible();

    // Nada de pontos é gravado: o detalhe recalcula a partir das opções salvas.
    await page.getByRole("link", { name: nomeExame }).click();
    await expect(
      page.getByText("8.5", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  });
});
