import type { Page } from "@playwright/test";
import { nomeUnico } from "./nomes";
import { buscar } from "./listagem";

/** Credenciais do usuário admin seedado (`prisma/seed.ts`) — mesmo login usado em dev. */
export const ADMIN = {
  email: "admin@admin.com",
  senha: "admin",
};

/**
 * Cria um usuário/profissional pela UI com as modalidades pedidas. Cada spec de
 * agendamento cria o SEU PRÓPRIO profissional (em vez de reusar o admin) — testes rodam
 * em paralelo (`fullyParallel`) e todos tendem a escolher o "primeiro horário
 * disponível"; compartilhar profissional faria dois testes colidirem por conflito de
 * agenda de verdade (o que é o comportamento correto do sistema, só não isolado pro teste).
 */
export async function criarProfissional(
  page: Page,
  modalidades: Array<"Fisioterapia" | "Educação Física"> = ["Fisioterapia", "Educação Física"],
): Promise<{ nome: string; email: string }> {
  const nome = nomeUnico("Profissional");
  const email = `${nome.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@e2e.local`;

  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-e2e-123");
  if (modalidades.includes("Fisioterapia")) {
    await page.getByLabel("Atende Fisioterapia").check();
  }
  if (modalidades.includes("Educação Física")) {
    await page.getByLabel("Atende Educação Física").check();
  }
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForURL(/\/usuarios$/);

  await buscar(page, "q", nome);
  return { nome, email };
}
