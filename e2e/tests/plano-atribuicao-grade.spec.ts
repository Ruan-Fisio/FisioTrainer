import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { criarPlano } from "../fixtures/planos";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import { criarSala } from "../fixtures/salas";

test.describe("atribuir plano + grade recorrente", () => {
  test("atribui um plano trimestral e gera as cobranças", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    const plano = await criarPlano(page, { atendimentos: "8", salas: [sala] });

    await atribuirPlano(page, paciente.id, plano.id, { trimestral: true });

    await expect(page.getByText("Plano atribuído com sucesso.")).toBeVisible();
    await expect(page.getByText(plano.nome)).toBeVisible();
  });

  test(
    "grade rala (1 dia/semana) ainda preenche o total do plano — e a aba " +
      "Agendamentos atualiza sozinha depois de salvar, mesmo em outro mês (regressão)",
    async ({ page }) => {
      const paciente = await criarPaciente(page);
      const sala = await criarSala(page);
      // Trimestral, 8 atendimentos/mês → 24 no total do período.
      const plano = await criarPlano(page, { atendimentos: "8", salas: [sala] });
      await atribuirPlano(page, paciente.id, plano.id, { trimestral: true });

      // Aba Agendamentos — navega pra outro mês ANTES de mexer na grade, pra reproduzir
      // o cenário do bug (cache do "outro mês" ficando preso depois de salvar).
      await page.goto(`/pacientes/${paciente.id}?tab=agendamentos`);
      await expect(page.getByText(plano.nome)).toBeVisible();
      await page.getByRole("button", { name: "Próximo mês" }).click();
      await expect(page.getByText("0 de 8 atendimentos neste mês")).toBeVisible();

      // Abre "Editar grade" e monta uma grade com só 1 dia/semana.
      await page.getByRole("button", { name: "Editar grade recorrente" }).click();
      await page.getByRole("button", { name: "Adicionar dia" }).click();

      // Prévia ao vivo: mesmo rala, o buffer generoso garante que fecha o total.
      await expect(page.getByText(/preenche os 24 atendimentos do plano inteiro/)).toBeVisible();

      await page.getByRole("button", { name: "Salvar grade" }).click();
      await expect(page.getByText(/Grade salva\. 24 agendamento\(s\) criado\(s\)/)).toBeVisible();

      // Sem dar reload e sem trocar de mês de novo: o card já reflete os novos
      // agendamentos neste mesmo mês (regressão do cache de "outro mês" desatualizado).
      await expect(page.getByText("0 de 8 atendimentos neste mês")).not.toBeVisible();
      await expect(page.getByText(/de 24 no plano/)).toBeVisible();
    },
  );
});
