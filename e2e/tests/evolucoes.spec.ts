import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";

test.describe("evoluções", () => {
  test("registra e edita uma evolução do paciente", async ({ page }) => {
    const paciente = await criarPaciente(page);

    await page.goto(`/pacientes/${paciente.id}/evolucoes/novo`);
    await page.getByLabel("HDP (Histórico da Doença Pregressa)").fill("Sem histórico relevante.");
    await page.getByLabel("HDA (Histórico da Doença Atual)").fill("Dor lombar há 3 dias.");
    await page.getByLabel("PA").fill("120x80");
    await page.getByLabel("FC").fill("70");
    await page.getByLabel("SpO2").fill("98");
    await page.getByLabel("FR").fill("18");
    await page.getByLabel("Temperatura").fill("36,5");
    await page.getByLabel("Evolução", { exact: true }).fill("Paciente relata melhora da dor.");
    await page.getByLabel("Conduta").fill("Manter conduta atual.");
    await page.getByRole("button", { name: "Registrar evolução" }).click();

    await expect(page.getByText("Evolução registrada com sucesso.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/pacientes/${paciente.id}$`));

    // Editar — abre a evolução recém-criada pela aba Evoluções.
    await page.getByRole("tab", { name: "Evoluções" }).click();
    // A lista só linka pro detalhe; o link "Editar" fica na tela de detalhe. O header do
    // paciente também tem seu próprio link "Editar" (pra editar o paciente) — por isso o
    // seletor de href específico, em vez de `getByRole("link", { name: "Editar" })`. E
    // `.last()` porque o 1º link do painel é o botão de ação "Nova evolução".
    await page.getByRole("tabpanel", { name: "Evoluções" }).getByRole("link").last().click();
    await page.locator('a[href*="/evolucoes/"][href$="/editar"]').click();
    await expect(page).toHaveURL(/\/evolucoes\/[^/]+\/editar$/);
    await page.getByLabel("Conduta").fill("Conduta atualizada no teste.");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Evolução atualizada com sucesso.")).toBeVisible();
  });
});
