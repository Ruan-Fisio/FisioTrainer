import { test, expect, type Locator, type Page } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";

async function arrastar(page: Page, alca: Locator, alvo: Locator) {
  await alca.scrollIntoViewIfNeeded();
  const origem = await alca.boundingBox();
  const destino = await alvo.boundingBox();
  if (!origem || !destino) throw new Error("Alça ou destino fora da tela");
  const x = origem.x + origem.width / 2;
  const y = origem.y + origem.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 8, { steps: 3 });
  await page.mouse.move(destino.x + destino.width / 2, destino.y + destino.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

const alcaColuna = (page: Page, nome: string) =>
  page
    .getByRole("button", { name: `Arrastar para reordenar a coluna ${nome}` })
    .filter({ visible: true });

const alcaSecao = (page: Page, nome: string) =>
  page
    .getByRole("button", { name: `Arrastar para reordenar a seção ${nome}` })
    .filter({ visible: true });

async function valores(locator: Locator) {
  return locator
    .filter({ visible: true })
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

const titulosColuna = (page: Page) => page.getByPlaceholder("Ex: Nome do membro");
const nomesSecao = (page: Page) => page.getByPlaceholder("Ex: Membros Superiores");

async function preencherColunas(page: Page, nomes: string[]) {
  for (const [i, nome] of nomes.entries()) {
    if (i > 0) {
      await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    }
    await titulosColuna(page).last().fill(nome);
  }
}

test.describe("reordenar seções e colunas do exame arrastando", () => {
  test("arrasta colunas e seções no cadastro e a ordem é gravada; na edição também", async ({
    page,
  }) => {
    const errosHidratacao: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
        errosHidratacao.push(msg.text());
      }
    });

    const nomeExame = nomeUnico("Exame Reordenar");
    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);

    await nomesSecao(page).last().fill("Primeira");
    await preencherColunas(page, ["Peso", "Altura", "Idade"]);

    // Última coluna para o topo; depois a primeira para o fim.
    await arrastar(page, alcaColuna(page, "Idade"), alcaColuna(page, "Peso"));
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Idade", "Peso", "Altura"]);
    await arrastar(page, alcaColuna(page, "Idade"), alcaColuna(page, "Altura"));
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Peso", "Altura", "Idade"]);

    // Adicionar seção retrai a primeira e deixa a nova aberta.
    await page.getByRole("button", { name: "Adicionar seção" }).last().click();
    await nomesSecao(page).last().fill("Segunda");
    await titulosColuna(page).last().fill("Dor");

    await arrastar(page, alcaSecao(page, "Segunda"), alcaSecao(page, "Primeira"));
    await expect.poll(() => valores(nomesSecao(page))).toEqual(["Segunda", "Primeira"]);
    // Retraída acompanha a seção, não a posição: "Primeira" continua fechada.
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Dor"]);

    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    await page.goto(`/exames?q=${encodeURIComponent(nomeExame)}`);
    const href = await page
      .getByRole("link", { name: "Editar" })
      .filter({ visible: true })
      .first()
      .getAttribute("href");
    await page.goto(href!);

    await expect.poll(() => valores(nomesSecao(page))).toEqual(["Segunda", "Primeira"]);
    await page.getByRole("button", { name: "Expandir seção" }).filter({ visible: true }).last().click();
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Peso", "Altura", "Idade"]);

    // Na edição o arraste é salvo pelo autosave, passando pelo merge.
    await arrastar(page, alcaColuna(page, "Altura"), alcaColuna(page, "Peso"));
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Altura", "Peso", "Idade"]);
    await arrastar(page, alcaSecao(page, "Primeira"), alcaSecao(page, "Segunda"));
    await expect.poll(() => valores(nomesSecao(page))).toEqual(["Primeira", "Segunda"]);

    await page.getByRole("button", { name: "Concluir" }).click();
    await expect(page.getByText("Exame salvo.")).toBeVisible({ timeout: 30_000 });

    await page.goto(href!);
    await expect.poll(() => valores(nomesSecao(page))).toEqual(["Primeira", "Segunda"]);
    await page.getByRole("button", { name: "Expandir seção" }).filter({ visible: true }).first().click();
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Altura", "Peso", "Idade"]);

    expect(errosHidratacao).toEqual([]);
  });

  test("reordena coluna pelo teclado", async ({ page }) => {
    await page.goto("/exames/novo");
    await preencherColunas(page, ["Peso", "Altura"]);

    await alcaColuna(page, "Peso").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");

    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Altura", "Peso"]);
  });

  test("clicar na alça sem arrastar não muda a ordem nem envia o formulário", async ({ page }) => {
    await page.goto("/exames/novo");
    await preencherColunas(page, ["Peso", "Altura"]);

    await alcaColuna(page, "Peso").click();

    await expect(page).toHaveURL(/\/exames\/novo$/);
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Peso", "Altura"]);
  });

  test("em tela de celular as colunas e a lista de seções também são arrastáveis", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/exames/novo");
    await nomesSecao(page).filter({ visible: true }).fill("Primeira");
    await preencherColunas(page, ["Peso", "Altura"]);

    await arrastar(page, alcaColuna(page, "Altura"), alcaColuna(page, "Peso"));
    await expect.poll(() => valores(titulosColuna(page))).toEqual(["Altura", "Peso"]);

    await page.getByRole("button", { name: "Adicionar seção" }).filter({ visible: true }).click();
    await nomesSecao(page).filter({ visible: true }).fill("Segunda");

    await arrastar(page, alcaSecao(page, "Segunda"), alcaSecao(page, "Primeira"));
    // A seção aberta continua sendo "Segunda", agora na primeira posição.
    await expect(page.getByText("Seção 1 de 2")).toBeVisible();
    await expect(nomesSecao(page).filter({ visible: true })).toHaveValue("Segunda");

    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(375);
  });
});

test.describe("fórmula compacta no cadastro do exame", () => {
  test("coluna calculada mostra só a fórmula; o resto fica no modal", async ({ page }) => {
    await page.goto("/exames/novo");
    await preencherColunas(page, ["Peso"]);
    await page
      .locator("select")
      .filter({ has: page.locator('option[value="NUMERO"]') })
      .filter({ visible: true })
      .last()
      .selectOption("NUMERO");

    await page.getByRole("button", { name: "Adicionar coluna" }).last().click();
    await titulosColuna(page).last().fill("Dobro");
    await page
      .locator("select")
      .filter({ has: page.locator('option[value="NUMERO"]') })
      .filter({ visible: true })
      .last()
      .selectOption("CALCULADO");

    const formula = page.getByLabel("Fórmula", { exact: true }).filter({ visible: true });
    await expect(formula).toBeVisible();

    // Nada de botões de coluna, operador ou função soltos na tela.
    for (const nome of ["Peso", "SE", "ABS", "Idade (paciente)"]) {
      await expect(
        page.getByRole("button", { name: nome, exact: true }).filter({ visible: true }),
      ).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Abrir editor" }).filter({ visible: true }).click();
    const modal = page.getByRole("dialog");
    for (const nome of ["Peso", "SE", "ABS", "Idade"]) {
      await expect(modal.getByRole("button", { name: nome, exact: true })).toBeVisible();
    }
    await modal.getByRole("button", { name: "Peso", exact: true }).click();
    await modal.getByRole("button", { name: "Aplicar" }).click();
    await expect(modal).toHaveCount(0);
    await expect(formula).toHaveValue("{Peso}");

    // Referência inexistente continua avisando fora do modal.
    await formula.fill("{Inexistente} * 2");
    await expect(
      page.getByText(/Referencia "Inexistente"/).filter({ visible: true }),
    ).toBeVisible();
  });
});
