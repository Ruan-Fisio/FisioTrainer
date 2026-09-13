import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

test.describe("usuários", () => {
  test("cria com modalidades, busca, edita e exclui", async ({ page }) => {
    const nome = nomeUnico("Usuario");
    const email = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@e2e.local`;
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/usuarios/novo");
    await page.getByLabel("Nome", { exact: true }).fill(nome);
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-e2e-123");
    await page.getByLabel("Atende Fisioterapia").check();
    await page.getByRole("button", { name: "Criar usuário" }).click();

    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByText("Usuário criado com sucesso.")).toBeVisible();

    // Busca por nome, e por e-mail.
    await buscar(page, "q", nome);
    await expect(page.getByRole("cell", { name: nome })).toBeVisible();
    await buscar(page, "q", email);
    await expect(page.getByRole("cell", { name: nome })).toBeVisible();
    // A badge da modalidade marcada aparece na listagem (linha da tabela desktop —
    // a mesma badge existe duplicada no card mobile, escondido via CSS só).
    await expect(
      page.getByRole("row", { name: nome }).getByText("Fisioterapia", { exact: true }),
    ).toBeVisible();

    // Editar: troca o nome e adiciona a 2ª modalidade.
    await page.getByRole("link", { name: "Editar" }).click();
    await expect(page).toHaveURL(/\/usuarios\/[^/]+$/);
    await expect(page.getByLabel("Atende Fisioterapia")).toBeChecked();
    await page.getByLabel("Nome", { exact: true }).fill(nomeEditado);
    await page.getByLabel("Atende Educação Física").check();
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByText("Usuário atualizado com sucesso.")).toBeVisible();

    await buscar(page, "q", nomeEditado);
    await expect(
      page.getByRole("row", { name: nomeEditado }).getByText("Educação Física", { exact: true }),
    ).toBeVisible();

    // Excluir.
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Usuário excluído com sucesso.")).toBeVisible();
    await buscar(page, "q", nomeEditado);
    await expect(page.getByText("Nenhum usuário encontrado.")).toBeVisible();
  });

  test("exige nome, e-mail e senha pra criar", async ({ page }) => {
    await page.goto("/usuarios/novo");
    await page.getByRole("button", { name: "Criar usuário" }).click();
    await expect(page).toHaveURL(/\/usuarios\/novo/);
  });
});
