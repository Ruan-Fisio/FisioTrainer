import type { Page } from "@playwright/test";
import { nomeUnico } from "./nomes";

/**
 * Cria um exercício pela UI (nome + 1 categoria + 1 link, todos obrigatórios) e volta pra
 * lista. Cria também uma categoria nova pra isso. Devolve o nome do exercício.
 */
export async function criarExercicio(page: Page): Promise<string> {
  const nomeCategoria = nomeUnico("Categoria");
  await page.goto("/biblioteca/categorias/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nomeCategoria);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page.waitForURL(/\/biblioteca\/categorias$/);

  const nome = nomeUnico("Exercicio");
  await page.goto("/biblioteca/exercicios/novo");
  await page.getByRole("button", { name: "Selecionar categorias" }).click();
  await page.getByRole("option", { name: nomeCategoria }).click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Link 1").fill("https://exemplo.com/exercicio-e2e");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Criar exercício" }).click();
  await page.waitForURL(/\/biblioteca\/exercicios$/);
  return nome;
}
