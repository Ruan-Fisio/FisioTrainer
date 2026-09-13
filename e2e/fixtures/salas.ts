import type { Page } from "@playwright/test";
import { nomeUnico } from "./nomes";

/**
 * Cria uma sala DEDICADA (capacidade bem alta) pela UI, pra testes de agendamento não
 * competirem pela capacidade da sala do seed (`Sala 1 - Cinesioterapia`, só 4/5 vagas) —
 * com vários specs rodando em paralelo e todos mirando o "primeiro horário disponível",
 * usar a sala do seed faria testes diferentes colidirem por capacidade de verdade (o
 * comportamento do sistema estaria certo, só não isolado pro teste). Devolve o nome.
 */
export async function criarSala(page: Page): Promise<string> {
  const nome = nomeUnico("Sala");

  await page.goto("/configuracoes?tab=salas");
  await page.getByRole("button", { name: "Nova sala" }).click();
  await page.getByLabel("Nome da sala").fill(nome);
  await page.getByLabel("Educação Física").fill("100");
  await page.getByLabel("Fisioterapia").fill("100");
  await page.getByRole("button", { name: "Criar sala" }).click();
  await page.getByText("Sala criada.").waitFor();

  return nome;
}
