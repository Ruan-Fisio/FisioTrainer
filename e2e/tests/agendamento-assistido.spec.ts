import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { criarPlano } from "../fixtures/planos";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import { primeiroDiaDisponivel, primeiroHorarioDisponivel } from "../fixtures/calendario";
import { criarProfissional } from "../fixtures/usuarios";
import { criarSala } from "../fixtures/salas";

test.describe("agendamento assistido (wizard por plano)", () => {
  test("agenda um atendimento pelos 3 passos do wizard", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    const plano = await criarPlano(page, { atendimentos: "4", salas: [sala] });
    await atribuirPlano(page, paciente.id, plano.id);
    const profissional = await criarProfissional(page, ["Fisioterapia"]);

    await page.goto(`/pacientes/${paciente.id}?tab=agendamentos`);
    await page.getByRole("button", { name: "Agendamentos" }).click();

    // Passo 1 — plano + profissional.
    await expect(page.getByText("Passo 1 de 3")).toBeVisible();
    await page.getByRole("button", { name: new RegExp(plano.nome) }).click();
    await page.getByLabel("Profissional").selectOption({ label: profissional.nome });
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2 — dia.
    await expect(page.getByText("Passo 2 de 3")).toBeVisible();
    await primeiroDiaDisponivel(page).click();

    // Passo 3 — horário.
    await expect(page.getByText("Passo 3 de 3")).toBeVisible();
    await primeiroHorarioDisponivel(page).click();
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();

    await expect(page.getByText("Agendamento criado com sucesso.")).toBeVisible();
    await expect(page.getByText("1 de 4 atendimentos neste mês")).toBeVisible();
  });

  test("bloqueia agendar quando o limite mensal do plano já foi atingido", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    // 1x/mês — o 1º agendamento já esgota o mês.
    const plano = await criarPlano(page, { atendimentos: "1", salas: [sala] });
    await atribuirPlano(page, paciente.id, plano.id);
    const profissional = await criarProfissional(page, ["Fisioterapia"]);

    await page.goto(`/pacientes/${paciente.id}?tab=agendamentos`);
    await page.getByRole("button", { name: "Agendamentos" }).click();
    await page.getByRole("button", { name: new RegExp(plano.nome) }).click();
    await page.getByLabel("Profissional").selectOption({ label: profissional.nome });
    await page.getByRole("button", { name: "Continuar" }).click();
    await primeiroDiaDisponivel(page).click();
    await primeiroHorarioDisponivel(page).click();
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByText("Agendamento criado com sucesso.")).toBeVisible();

    // 2ª tentativa no mesmo mês: o wizard já avisa antes de deixar escolher outro dia.
    await page.getByRole("button", { name: "Agendamentos" }).click();
    await page.getByRole("button", { name: new RegExp(plano.nome) }).click();
    await page.getByLabel("Profissional").selectOption({ label: profissional.nome });
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText(/já foram agendados|já está cheio/)).toBeVisible();
  });
});
