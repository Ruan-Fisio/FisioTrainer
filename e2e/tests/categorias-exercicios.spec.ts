import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

test.describe("categorias", () => {
  test("cria, edita e exclui uma categoria", async ({ page }) => {
    const nome = nomeUnico("Categoria");
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/biblioteca/categorias/novo");
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("button", { name: "Criar categoria" }).click();
    await expect(page.getByText("Categoria criada com sucesso.")).toBeVisible();

    await buscar(page, "q", nome);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Nome").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Categoria atualizada com sucesso.")).toBeVisible();

    await buscar(page, "q", nomeEditado);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Categoria excluída com sucesso.")).toBeVisible();
  });
});

test.describe("exercícios", () => {
  test("cria com categoria vinculada, edita e exclui", async ({ page }) => {
    const nomeCategoria = nomeUnico("Categoria");
    await page.goto("/biblioteca/categorias/novo");
    await page.getByLabel("Nome").fill(nomeCategoria);
    await page.getByRole("button", { name: "Criar categoria" }).click();
    await expect(page.getByText("Categoria criada com sucesso.")).toBeVisible();

    const nome = nomeUnico("Exercicio");
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/biblioteca/exercicios/novo");
    await page.getByRole("button", { name: "Selecionar categorias" }).click();
    await page.getByRole("option", { name: nomeCategoria }).click();
    await page.keyboard.press("Escape");
    // Pelo menos 1 link é obrigatório.
    await page.getByLabel("Link 1").fill("https://exemplo.com/exercicio-e2e");
    await page.getByLabel("Nome", { exact: true }).fill(nome);
    await page.getByRole("button", { name: "Criar exercício" }).click();

    await expect(page.getByText("Exercício criado com sucesso.")).toBeVisible();

    await buscar(page, "q", nome);
    await expect(page.getByRole("cell", { name: nomeCategoria })).toBeVisible();

    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Nome").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Exercício atualizado com sucesso.")).toBeVisible();

    await buscar(page, "q", nomeEditado);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Exercício excluído com sucesso.")).toBeVisible();
  });
});
