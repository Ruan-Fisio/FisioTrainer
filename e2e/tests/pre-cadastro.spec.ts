import { test, expect, type Page } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

async function enviarPreCadastro(page: Page, nome: string) {
  await page.goto("/pre-cadastro");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Sobrenome").fill("Curadoria");
  await page.getByLabel(/Celular/).fill("11912345678");
  await page.getByLabel("Queixa principal").fill("Dor lombar há três semanas ao sentar.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Recebemos seus dados!")).toBeVisible();
}

test.describe("pré-cadastro público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("form é público, mascara o celular e valida", async ({ page }) => {
    await page.goto("/pre-cadastro");
    await expect(page).toHaveURL(/\/pre-cadastro$/);

    const celular = page.getByLabel(/Celular/);
    await celular.fill("11912345678");
    await expect(celular).toHaveValue("(11) 91234-5678");
    await expect(page.getByText("EM BREVE")).toBeVisible();

    await page.getByLabel("Nome", { exact: true }).fill("Ana");
    await page.getByLabel("Sobrenome").fill("Souza");
    await celular.fill("1191");
    await page.getByLabel("Queixa principal").fill("Dor no ombro direito");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Informe um celular válido com DDD.")).toBeVisible();
  });

  test("curadoria exige login", async ({ page }) => {
    await page.goto("/curadoria");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("fila de curadoria", () => {
  test("aprova um pré-cadastro e efetiva o paciente", async ({ page, browser }) => {
    const nome = nomeUnico("Aprovar");
    const publico = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    await enviarPreCadastro(await publico.newPage(), nome);
    await publico.close();

    await page.goto("/curadoria");
    await buscar(page, "q", nome);
    await expect(page.getByText("Dor lombar há três semanas ao sentar.")).toBeVisible();
    await page.getByRole("link", { name: "Aprovar e cadastrar" }).click();

    await expect(page).toHaveURL(/\/pacientes\/novo\?preCadastro=/);
    await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(`${nome} Curadoria`);
    await expect(page.getByLabel("Contato", { exact: true })).toHaveValue("(11) 91234-5678");
    await page.getByRole("button", { name: "Criar paciente" }).click();

    await expect(page).toHaveURL(/\/curadoria$/);
    await page.goto("/curadoria?status=aprovados");
    await buscar(page, "q", nome);
    await expect(page.getByText(`${nome} Curadoria`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver paciente" })).toBeVisible();
  });

  test("rejeita com motivo e mantém no histórico", async ({ page, browser }) => {
    const nome = nomeUnico("Rejeitar");
    const publico = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    await enviarPreCadastro(await publico.newPage(), nome);
    await publico.close();

    await page.goto("/curadoria");
    await buscar(page, "q", nome);
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByLabel("Motivo (opcional)").fill("Fora da área de atendimento");
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByText("Pré-cadastro rejeitado.")).toBeVisible();

    await page.goto("/curadoria?status=rejeitados");
    await buscar(page, "q", nome);
    await expect(page.getByText(`${nome} Curadoria`)).toBeVisible();
    await expect(page.getByText("Fora da área de atendimento")).toBeVisible();
  });
});

test("botão copia o link público do pré-cadastro", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/curadoria");
  await page.getByRole("button", { name: "Copiar link do pré-cadastro" }).click();
  await expect(page.getByText("Link do pré-cadastro copiado.")).toBeVisible();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toMatch(/\/pre-cadastro$/);
});
