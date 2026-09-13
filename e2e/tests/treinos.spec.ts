import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { buscar } from "../fixtures/listagem";
import { criarPaciente } from "../fixtures/pacientes";
import { criarExercicio } from "../fixtures/exercicios";

test.describe("treinos (catálogo)", () => {
  test("cria, edita e exclui um treino modelo", async ({ page }) => {
    const exercicio = await criarExercicio(page);
    const nome = nomeUnico("Treino");
    const nomeEditado = `${nome} (editado)`;

    // Pelo menos 1 dia com 1 exercício selecionado é obrigatório.
    await page.goto("/treinos/novo");
    await page.getByRole("button", { name: "Selecionar exercício" }).click();
    await page.getByRole("option", { name: exercicio }).click();
    await page.getByLabel("Nome", { exact: true }).fill(nome);
    await page.getByRole("button", { name: "Criar treino" }).click();
    await expect(page.getByText("Treino criado com sucesso.")).toBeVisible();

    await buscar(page, "q", nome);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Nome", { exact: true }).fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Treino atualizado com sucesso.")).toBeVisible();

    // Salvar leva pro detalhe do treino, não pra lista.
    await page.goto("/treinos");
    await buscar(page, "q", nomeEditado);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Treino excluído com sucesso.")).toBeVisible();
  });

  test("exige ao menos um dia com exercício selecionado", async ({ page }) => {
    await page.goto("/treinos/novo");
    await page.getByLabel("Nome", { exact: true }).fill(nomeUnico("Treino"));
    await page.getByRole("button", { name: "Criar treino" }).click();
    await expect(page.getByText("Adicione ao menos um dia")).toBeVisible();
  });
});

test.describe("treinos do paciente", () => {
  test("atribui um treino do catálogo a um paciente", async ({ page }) => {
    const exercicio = await criarExercicio(page);
    const nomeTreino = nomeUnico("Treino");

    await page.goto("/treinos/novo");
    await page.getByRole("button", { name: "Selecionar exercício" }).click();
    await page.getByRole("option", { name: exercicio }).click();
    await page.getByLabel("Nome", { exact: true }).fill(nomeTreino);
    await page.getByRole("button", { name: "Criar treino" }).click();
    await expect(page.getByText("Treino criado com sucesso.")).toBeVisible();

    const paciente = await criarPaciente(page);
    await page.goto(`/pacientes/${paciente.id}?tab=treinos`);
    await page.getByRole("button", { name: "Atribuir treino" }).click();
    // Lista de checkboxes simples (não é um Popover/Command) — clicar no label.
    await page.locator("label", { hasText: nomeTreino }).click();
    await page.getByRole("button", { name: "Atribuir" }).click();

    await expect(page.getByText("Treino atribuído com sucesso.")).toBeVisible();
    await expect(page.getByText(nomeTreino).first()).toBeVisible();
  });
});
