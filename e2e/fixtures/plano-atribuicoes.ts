import type { Page } from "@playwright/test";

/**
 * Atribui um plano a um paciente pela UI (`/pacientes/{id}/planos/novo`), gerando 1
 * parcela com vencimento hoje. Periodicidade MENSAL por padrão (não parcela, não precisa
 * escolher forma de pagamento) — passe `trimestral: true` pra testar o outro caminho.
 * Deixa a página em `/pacientes/{id}?tab=planos` depois de salvar.
 */
export async function atribuirPlano(
  page: Page,
  pacienteId: string,
  planoId: string,
  opcoes: { trimestral?: boolean } = {},
) {
  await page.goto(`/pacientes/${pacienteId}/planos/novo`);
  await page.getByLabel("Plano", { exact: true }).selectOption(planoId);
  if (opcoes.trimestral) {
    await page.getByText("Trimestral", { exact: true }).click();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Qual a data de vencimento da 1ª parcela?").fill(hoje);
  await page.getByRole("button", { name: "Gerar parcelas" }).click();
  await page.getByRole("button", { name: "Atribuir plano" }).click();
  await page.waitForURL(/tab=planos/);
}
