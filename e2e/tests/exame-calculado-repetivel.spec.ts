import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("coluna calculada em campo com múltiplas entradas", () => {
  test("cada entrada calcula com os próprios valores, ao vivo e no detalhe salvo", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Calculado Repetivel");

    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Séries");
    await page.getByText("Permitir múltiplas entradas deste campo").last().click();

    const titulosColuna = page.getByPlaceholder("Ex: Nome do membro");
    const tiposColuna = page.locator('select[class*="rounded-lg border"]').filter({
      has: page.locator('option[value="NUMERO"]'),
    });

    await titulosColuna.last().fill("Carga");
    await tiposColuna.last().selectOption("NUMERO");

    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna.last().fill("Volume");
    await tiposColuna.last().selectOption("CALCULADO");
    await page.getByPlaceholder("Ex: {Peso} / ({Altura} * {Altura})").last().fill("{Carga} * 2");

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);

    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nomeExame });

    await page.getByRole("button", { name: "Adicionar entrada" }).filter({ visible: true }).click();

    const cargas = page.locator('input[type="number"]:visible');
    await expect(cargas).toHaveCount(2);
    await cargas.nth(0).fill("10");
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(
      page.getByText("Preencha Carga para calcular").filter({ visible: true }),
    ).toBeVisible();

    await cargas.nth(1).fill("15");
    await expect(page.getByText("30", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Avaliação registrada com sucesso.")).toBeVisible();

    // Nunca gravado: é recalculado por entrada ao abrir o detalhe.
    await page.getByRole("link", { name: nomeExame }).click();
    await expect(page.getByText("20", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("30", { exact: true }).filter({ visible: true })).toBeVisible();
  });
});
