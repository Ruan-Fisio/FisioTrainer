import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

/** Preenche os campos obrigatórios comuns de um plano (menos nome/salas). */
async function preencherCamposBase(page: import("@playwright/test").Page) {
  await page.getByLabel("Número de atendimentos").fill("4");
  await page.getByLabel("Créditos de remarcação por mês").fill("1");
  await page.getByLabel("Mensal (à vista)").fill("400,00");
  await page.getByLabel("Trimestral à vista").fill("1080,00");
}

/** Sala criada pelo seed (`prisma/seed.ts`) — sempre existe no banco de teste. */
const SALA_SEED = "Sala 1 - Cinesioterapia";

// O checkbox em si tem `pointer-events-none` (o `<label>` é quem trata o clique,
// ver `plano-form.tsx`) — clicar precisa mirar no label, não no checkbox.
function labelDaSala(page: import("@playwright/test").Page, sala: string) {
  return page.locator("label", { hasText: sala });
}

function checkboxDaSala(page: import("@playwright/test").Page, sala: string) {
  return labelDaSala(page, sala).getByRole("checkbox");
}

test.describe("planos", () => {
  test("exige ao menos uma sala pra salvar", async ({ page }) => {
    const nome = nomeUnico("Plano");
    await page.goto("/planos/novo");
    await page.getByLabel("Nome").fill(nome);
    await preencherCamposBase(page);
    // Nenhuma sala marcada — o form nem deveria deixar submeter sem isso.
    await page.getByRole("button", { name: "Criar plano" }).click();

    await expect(page.getByText("Selecione ao menos uma sala")).toBeVisible();
    await expect(page).toHaveURL(/\/planos\/novo/);
  });

  test("cria, edita e exclui um plano", async ({ page }) => {
    const nome = nomeUnico("Plano");
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/planos/novo");
    await page.getByLabel("Nome").fill(nome);
    await preencherCamposBase(page);
    await labelDaSala(page, SALA_SEED).click();
    await page.getByRole("button", { name: "Criar plano" }).click();

    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByText("Plano criado com sucesso.")).toBeVisible();

    // Editar.
    await buscar(page, "q", nome);
    await expect(page.getByRole("cell", { name: nome, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Editar" }).click();
    await expect(page).toHaveURL(/\/planos\//);

    // A sala marcada na criação já vem marcada de volta ao editar.
    await expect(checkboxDaSala(page, SALA_SEED)).toBeChecked();

    await page.getByLabel("Nome").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page).toHaveURL(/\/planos$/);
    await expect(page.getByText("Plano atualizado com sucesso.")).toBeVisible();

    // Excluir (plano recém-criado, sem atribuição — exclusão liberada).
    await buscar(page, "q", nomeEditado);
    await expect(page.getByRole("cell", { name: nomeEditado, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Plano excluído com sucesso.")).toBeVisible();
    await buscar(page, "q", nomeEditado);
    await expect(page.getByText("Nenhum plano encontrado.")).toBeVisible();
  });

  test("cadastro de plano só pede os valores à vista", async ({ page }) => {
    await page.goto("/planos/novo");
    // O parcelamento no cartão não tem mais preço fixo próprio — a taxa é configurada
    // em Configurações > Financeiro e aplicada sobre o valor à vista na atribuição.
    await expect(page.getByLabel("Mensal (à vista)")).toBeVisible();
    await expect(page.getByLabel("Trimestral à vista")).toBeVisible();
    await expect(page.getByLabel("Trimestral em até 3x no cartão")).not.toBeVisible();
  });
});
