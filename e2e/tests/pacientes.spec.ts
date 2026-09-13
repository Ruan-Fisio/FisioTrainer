import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";

test.describe("pacientes", () => {
  test("cria, busca, edita e exclui um paciente", async ({ page }) => {
    const nome = nomeUnico("Paciente");
    const nomeEditado = `${nome} (editado)`;

    // Criar — só o nome é obrigatório.
    await page.goto("/pacientes");
    await page.getByRole("link", { name: "Novo paciente" }).click();
    await expect(page).toHaveURL(/\/pacientes\/novo/);
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("button", { name: "Criar paciente" }).click();

    await expect(page).toHaveURL(/\/pacientes$/);
    await expect(page.getByText("Paciente criado com sucesso.")).toBeVisible();

    // Buscar — encontra pelo nome, e não encontra por um texto que não existe.
    await buscar(page, "q", nome);
    await expect(page.getByRole("cell", { name: nome, exact: true })).toBeVisible();

    await buscar(page, "q", "zzz-nao-existe-zzz");
    await expect(page.getByText("Nenhum paciente encontrado.")).toBeVisible();

    // Editar.
    await buscar(page, "q", nome);
    await page.getByRole("link", { name: "Editar" }).click();
    await expect(page).toHaveURL(/\/editar$/);
    await page.getByLabel("Nome").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page).toHaveURL(/\/pacientes$/);
    await expect(page.getByText("Paciente atualizado com sucesso.")).toBeVisible();

    // Excluir — exige confirmação no diálogo.
    await buscar(page, "q", nomeEditado);
    await expect(page.getByRole("cell", { name: nomeEditado, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText(`excluir ${nomeEditado}`, { exact: false })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Paciente excluído com sucesso.")).toBeVisible();
    await buscar(page, "q", nomeEditado);
    await expect(page.getByText("Nenhum paciente encontrado.")).toBeVisible();
  });

  test("exige o nome pra criar", async ({ page }) => {
    await page.goto("/pacientes/novo");
    await page.getByRole("button", { name: "Criar paciente" }).click();
    // Validação HTML5 nativa (`required`) — a navegação não deve acontecer.
    await expect(page).toHaveURL(/\/pacientes\/novo/);
  });
});
