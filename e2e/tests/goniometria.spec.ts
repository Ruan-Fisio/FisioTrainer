import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

test.describe("biblioteca de movimento — goniometria", () => {
  test("cria, edita e exclui um movimento", async ({ page }) => {
    const nome = nomeUnico("Movimento");
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/biblioteca-movimento/goniometria/novo");
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Grau ideal").fill("90");
    await page.getByRole("button", { name: "Criar movimento" }).click();
    await expect(page.getByText("Movimento criado com sucesso.")).toBeVisible();

    await buscar(page, "q", nome);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Nome").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Movimento atualizado com sucesso.")).toBeVisible();

    await buscar(page, "q", nomeEditado);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Movimento excluído com sucesso.")).toBeVisible();
  });
});
