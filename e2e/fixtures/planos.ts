import type { Page } from "@playwright/test";
import { nomeUnico } from "./nomes";
import { buscar } from "./listagem";

/** Sala criada pelo seed (`prisma/seed.ts`) — sempre existe no banco de teste. */
export const SALA_SEED = "Sala 1 - Cinesioterapia";

/** O checkbox em si tem `pointer-events-none` — clicar mira no `<label>`, não nele. */
export function labelDaSala(page: Page, sala: string) {
  return page.locator("label", { hasText: sala });
}

export function checkboxDaSala(page: Page, sala: string) {
  return labelDaSala(page, sala).getByRole("checkbox");
}

export type OpcoesPlano = {
  tipos?: Array<"Fisioterapia" | "Educação Física">;
  atendimentos?: string;
  creditosRemarcacao?: string;
  salas?: string[];
};

/**
 * Cria um plano pela UI com os valores padrão de teste (Fisioterapia, 4x/mês, sala do
 * seed) — sobrescrevíveis via `opcoes`. Devolve `{ nome, id }`.
 */
export async function criarPlano(
  page: Page,
  opcoes: OpcoesPlano = {},
): Promise<{ nome: string; id: string }> {
  const {
    tipos = ["Fisioterapia"],
    atendimentos = "4",
    creditosRemarcacao = "1",
    salas = [SALA_SEED],
  } = opcoes;
  const nome = nomeUnico("Plano");

  await page.goto("/planos/novo");
  await page.getByLabel("Nome").fill(nome);

  // "Fisioterapia" já vem marcado por padrão — ajusta conforme pedido.
  for (const tipo of ["Fisioterapia", "Educação Física"] as const) {
    const marcado = await page
      .locator("label", { hasText: tipo })
      .getByRole("checkbox")
      .isChecked();
    const deveMarcar = tipos.includes(tipo);
    if (marcado !== deveMarcar) {
      await page.locator("label", { hasText: tipo }).click();
    }
  }

  await page.getByLabel("Número de atendimentos").fill(atendimentos);
  await page.getByLabel("Créditos de remarcação por mês").fill(creditosRemarcacao);
  await page.getByLabel("Mensal (à vista)").fill("400,00");
  await page.getByLabel("Trimestral à vista").fill("1080,00");
  await page.getByLabel("Trimestral em até 3x no cartão").fill("1188,00");

  for (const sala of salas) {
    await labelDaSala(page, sala).click();
  }

  await page.getByRole("button", { name: "Criar plano" }).click();
  await page.waitForURL(/\/planos$/);

  await buscar(page, "q", nome);
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForURL(/\/planos\/[^/?]+$/);

  const id = new URL(page.url()).pathname.split("/").pop()!;
  return { nome, id };
}
