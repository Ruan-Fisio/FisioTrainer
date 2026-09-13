import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { nomeUnico } from "../fixtures/nomes";

test.describe("cobranças avulsas", () => {
  test("registra com nota fiscal (taxa aplicada), marca como paga, edita e exclui", async ({
    page,
  }) => {
    const paciente = await criarPaciente(page);
    const planoNome = nomeUnico("Sessão avulsa");

    await page.goto(`/pacientes/${paciente.id}/cobrancas/novo`);
    await page.getByLabel("Plano").fill(planoNome);
    await page.getByLabel("Valor (R$)").fill("100,00");
    await page.getByLabel("Data de Vencimento").fill("2027-01-10");
    await page.getByText("Nota fiscal inclusa", { exact: false }).click();
    // 7% de taxa sobre 100,00 → 107,00.
    await expect(page.getByText("R$ 107,00")).toBeVisible();
    await page.getByRole("button", { name: "Registrar cobrança" }).click();

    await expect(page).toHaveURL(/tab=financeiro/);
    await expect(page.getByText("Cobrança registrada com sucesso.")).toBeVisible();
    await expect(page.getByText(planoNome)).toBeVisible();

    // Marcar como paga.
    await page.getByRole("button", { name: "Marcar como paga" }).click();
    await page.getByRole("button", { name: "Confirmar pagamento" }).click();
    await expect(page.getByText("Cobrança marcada como paga.")).toBeVisible();

    // Editar (escopado à aba Financeiro — o header do paciente também tem um link "Editar").
    await page.getByRole("tabpanel", { name: "Financeiro" }).getByRole("link", { name: "Editar" }).click();
    await expect(page).toHaveURL(/\/editar$/);
    const nomeEditado = `${planoNome} (editado)`;
    await page.getByLabel("Plano").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Cobrança atualizada com sucesso.")).toBeVisible();
    await expect(page.getByText(nomeEditado)).toBeVisible();

    // Excluir.
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Cobrança excluída com sucesso.")).toBeVisible();
    await expect(page.getByText(nomeEditado)).not.toBeVisible();
  });
});
