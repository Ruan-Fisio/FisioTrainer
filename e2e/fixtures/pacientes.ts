import type { Page } from "@playwright/test";
import { nomeUnico } from "./nomes";
import { buscar } from "./listagem";

/**
 * Cria um paciente pela UI (só o nome é obrigatório), busca ele na lista recém-criada e
 * entra na página de detalhe pra capturar o id. Devolve `{ nome, id }`.
 */
export async function criarPaciente(
  page: Page,
  prefixo = "Paciente",
): Promise<{ nome: string; id: string }> {
  const nome = nomeUnico(prefixo);
  await page.goto("/pacientes/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("button", { name: "Criar paciente" }).click();
  await page.waitForURL(/\/pacientes$/);

  await buscar(page, "q", nome);
  // Via o link "Editar" (existe tanto no card mobile quanto na linha desktop, só um
  // fica visível por vez) em vez de clicar na célula — funciona em qualquer viewport.
  const href = await page.getByRole("link", { name: "Editar" }).getAttribute("href");
  const id = href!.split("/").filter(Boolean)[1];
  return { nome, id };
}
