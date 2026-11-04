import { test, expect, type Page } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";

/** "YYYY-MM-DD" de hoje em Brasília, sem depender do fuso de quem roda a suíte. */
function hojeBrasilia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function registrar(
  page: Page,
  dados: { descricao: string; categoria: string; valor: string; data?: string; paga?: boolean },
) {
  await page.goto("/dashboard?tab=despesas");
  await page.getByRole("link", { name: "Nova despesa" }).click();
  await page.getByLabel("Descrição").fill(dados.descricao);
  await page.getByLabel("Categoria").selectOption({ label: dados.categoria });
  await page.getByLabel("Valor (R$)").fill(dados.valor);
  if (dados.data) await page.getByLabel("Data da compra ou vencimento").fill(dados.data);
  if (dados.paga) await page.getByLabel("Pagamento").selectOption("PAGO");
  await page.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(page.getByText("Despesa registrada.")).toBeVisible();
  await expect(page).toHaveURL(/tab=despesas/);
}

test.describe("despesas", () => {
  test.describe.configure({ mode: "serial" });

  test("registra, dá baixa, edita e exclui uma despesa", async ({ page }) => {
    const descricao = nomeUnico("Conta de luz");
    await registrar(page, { descricao, categoria: "Energia elétrica", valor: "1.234,56" });

    const painel = page.getByRole("tabpanel", { name: "Despesas" });
    const linha = painel.getByRole("row").filter({ hasText: descricao });
    await expect(linha).toContainText("Energia elétrica");
    await expect(linha).toContainText("A pagar");
    await expect(painel.getByText("Para onde vai o dinheiro")).toBeVisible();

    await linha.getByRole("button", { name: "Marcar como paga" }).click();
    await page.getByRole("button", { name: "Confirmar pagamento" }).click();
    await expect(page.getByText("Despesa marcada como paga.")).toBeVisible();
    await expect(linha).toContainText("Paga em");

    await linha.getByRole("link", { name: "Editar" }).click();
    await expect(page.getByLabel("Valor (R$)")).toHaveValue("1234,56");
    const editada = `${descricao} (editada)`;
    await page.getByLabel("Descrição").fill(editada);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Despesa atualizada.")).toBeVisible();

    const linhaEditada = painel.getByRole("row").filter({ hasText: editada });
    await linhaEditada.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Despesa excluída.")).toBeVisible();
    await expect(linhaEditada).toHaveCount(0);
  });

  test("erro de validação mantém o que foi digitado", async ({ page }) => {
    await page.goto("/dashboard/despesas/nova");
    const descricao = nomeUnico("Valor errado");
    await page.getByLabel("Descrição").fill(descricao);
    await page.getByLabel("Categoria").selectOption({ label: "Outros" });
    await page.getByLabel("Valor (R$)").fill("abc");
    await page.getByRole("button", { name: "Registrar despesa" }).click();

    await expect(page.getByText("Valor inválido")).toBeVisible();
    await expect(page.getByLabel("Descrição")).toHaveValue(descricao);
  });

  test("despesa de outro mês abre naquele mês, navegável e filtrável pela URL", async ({ page }) => {
    const descricao = nomeUnico("Maca nova");
    await registrar(page, {
      descricao,
      categoria: "Equipamentos",
      valor: "2500",
      data: "2026-03-10",
    });
    await expect(page).toHaveURL(/mes=2026-03/);

    const painel = page.getByRole("tabpanel", { name: "Despesas" });
    await expect(painel.getByRole("row").filter({ hasText: descricao })).toBeVisible();

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page).toHaveURL(/mes=2026-04/);
    await expect(painel.getByRole("row").filter({ hasText: descricao })).toHaveCount(0);

    await page.goto("/dashboard?tab=despesas&mes=2026-03&categorias=ENERGIA");
    await expect(painel.getByRole("row").filter({ hasText: descricao })).toHaveCount(0);
    await page.goto("/dashboard?tab=despesas&mes=2026-03&categorias=EQUIPAMENTO");
    await expect(painel.getByRole("row").filter({ hasText: descricao })).toBeVisible();
    // Conta vencida aparece como atrasada nos outros meses.
    await page.goto("/dashboard?tab=despesas&mes=2026-04");
    await expect(painel.getByText("Contas atrasadas de outros meses")).toBeVisible();
    await expect(painel.getByText(descricao)).toBeVisible();
  });

  test("despesa paga reduz o saldo na aba Financeiro", async ({ page }) => {
    await registrar(page, {
      descricao: nomeUnico("Aluguel"),
      categoria: "Aluguel",
      valor: "777,77",
      data: hojeBrasilia(),
      paga: true,
    });

    await page.getByRole("tab", { name: "Financeiro" }).click();
    const painel = page.getByRole("tabpanel", { name: "Financeiro" });
    await expect(painel.getByText("Resultado do mês")).toBeVisible();
    await expect(painel.getByText("Receita x despesas")).toBeVisible();

    await painel.getByText("Ver valores mês a mês").click();
    const linhaAtual = painel.locator("details tbody tr").first();
    await expect(linhaAtual.locator("td").nth(2)).toContainText("777,77");
    await expect(linhaAtual.locator("td").nth(3)).toContainText("-R$");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("lista em cards, com filtros sem estourar a largura", async ({ page }) => {
      const descricao = nomeUnico("Internet");
      await registrar(page, { descricao, categoria: "Internet e telefone", valor: "120" });

      await expect(page.locator("table")).toBeHidden();
      await expect(page.getByText(descricao, { exact: true }).first()).toBeVisible();
      const estouro = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(estouro).toBeLessThanOrEqual(0);
    });
  });
});
