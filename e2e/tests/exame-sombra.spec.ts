import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("exame sombra — prefill de retorno com valores anteriores", () => {
  test("retorno de um exame sombra vem preenchido com os valores da avaliação, com indicador que some ao editar", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Sombra");

    // Cria o exame já marcado como "sombra", com 2 colunas (texto + número).
    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page
      .getByText("Exame sombra (retornos vêm pré-preenchidos")
      .click();

    await page
      .getByPlaceholder("Ex: Membros Superiores")
      .last()
      .fill("Força");
    await page
      .getByPlaceholder("Ex: Nome do membro")
      .last()
      .fill("Observação");
    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    const titulosColuna = page.getByPlaceholder("Ex: Nome do membro");
    await titulosColuna.last().fill("Carga (kg)");
    const tiposColuna = page.locator('select[class*="rounded-lg border"]').filter({
      has: page.locator('option[value="NUMERO"]'),
    });
    await tiposColuna.last().selectOption("NUMERO");

    // Uma 3ª coluna NO MESMO campo (não um campo separado) — regressão: o
    // botão de ocultar não pode esconder o campo inteiro quando ele já tem
    // colunas preenchidas, só as colunas individuais que ficaram vazias.
    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("Anotação");

    // Um segundo campo (coluna própria), que fica sem valor na avaliação —
    // é o alvo do botão "Ocultar campos sem valor anterior" no retorno.
    await page.getByRole("button", { name: "Adicionar campo" }).last().click();
    await titulosColuna.last().fill("Nota extra");

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    // Avaliação inicial, com valores nas duas colunas.
    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    const camposTexto = page.getByRole("textbox");
    await camposTexto.nth(0).fill("Dor leve");
    await page.locator('input[type="number"]').last().fill("20");
    // "Anotação" e "Nota extra" ficam em branco de propósito.
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.getByText("Avaliação registrada com sucesso."),
    ).toBeVisible();

    // Abre "Novo retorno" a partir da avaliação recém-criada.
    await page.getByRole("link", { name: "Novo retorno" }).click();
    await expect(page.getByText("Novo retorno")).toBeVisible();

    // Os dois campos vêm preenchidos com os valores anteriores + indicador visível.
    const textoRetorno = page.getByRole("textbox").first();
    await expect(textoRetorno).toHaveValue("Dor leve");
    const numeroRetorno = page.locator('input[type="number"]').last();
    await expect(numeroRetorno).toHaveValue("20");
    const indicadoresSombra = page
      .getByText("Valor anterior — edite se mudou")
      .filter({ visible: true });
    await expect(indicadoresSombra).toHaveCount(2);

    // "Anotação" e "Nota extra" não tinham valor anterior — aparecem normalmente por padrão.
    const anotacao = page.getByText("Anotação", { exact: true }).filter({ visible: true });
    const notaExtra = page.getByText("Nota extra", { exact: true }).filter({ visible: true });
    await expect(anotacao).toBeVisible();
    await expect(notaExtra).toBeVisible();

    // Botão oculta só as colunas sem valor anterior — "Anotação" some, mas
    // "Observação"/"Carga (kg)" (mesmo campo, preenchidas) continuam visíveis:
    // regressão do bug em que o campo inteiro sumia por ter 1 coluna vazia.
    const botaoOcultar = page.getByRole("button", {
      name: "Ocultar campos sem valor anterior",
    });
    await expect(botaoOcultar).toBeVisible();
    await botaoOcultar.click();
    await expect(anotacao).toHaveCount(0);
    await expect(notaExtra).toHaveCount(0);
    await expect(textoRetorno).toBeVisible();
    await expect(numeroRetorno).toBeVisible();

    // "Mostrar todos os campos" traz "Anotação"/"Nota extra" de volta.
    await page.getByRole("button", { name: "Mostrar todos os campos" }).click();
    await expect(anotacao).toBeVisible();
    await expect(notaExtra).toBeVisible();

    // Editar só o campo numérico faz o indicador sumir só dele.
    await numeroRetorno.fill("25");
    await expect(indicadoresSombra).toHaveCount(1);

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.getByText("Retorno registrado com sucesso."),
    ).toBeVisible();

    // O "Salvar" volta pra avaliação; entra no retorno recém-criado pela lista "Retornos".
    await page.getByRole("link", { name: /\d{2}\/\d{2}\/\d{4}/ }).click();

    // Confere os valores salvos no detalhe do retorno.
    await expect(page.getByText("Dor leve", { exact: true })).toBeVisible();
    await expect(page.getByText("25", { exact: true })).toBeVisible();
  });
});
