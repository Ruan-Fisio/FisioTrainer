import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { criarPlano } from "../fixtures/planos";
import { criarSala } from "../fixtures/salas";
import { criarProfissional } from "../fixtures/usuarios";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import { primeiroDiaDisponivel, primeiroHorarioDisponivel } from "../fixtures/calendario";

test.describe("agenda", () => {
  test("navega entre visões mês/semana/dia e pra aba Lista, sem erro", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("tab", { name: "Calendário" })).toBeVisible();

    for (const visao of ["Semana", "Dia", "Mês"]) {
      await page.getByRole("button", { name: visao, exact: true }).click();
      await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();
    }

    await page.getByRole("button", { name: "Próximo" }).click();
    await page.getByRole("button", { name: "Anterior" }).click();
    await page.getByRole("button", { name: "Hoje" }).click();

    await page.getByRole("tab", { name: "Lista" }).click();
    await expect(page.getByText("Nenhum evento encontrado.").or(page.getByRole("columnheader", { name: "Modalidade" })).first()).toBeVisible();
  });

  test(
    "clicar num evento abre só os detalhes — a agenda é somente leitura (sem editar/excluir)",
    async ({ page }) => {
      const paciente = await criarPaciente(page);
      const sala = await criarSala(page);
      const plano = await criarPlano(page, { atendimentos: "4", salas: [sala] });
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

      await page.goto("/agenda");
      await page.getByRole("button", { name: paciente.nome }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(profissional.nome)).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Editar" })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Excluir" })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Remarcar" })).toHaveCount(0);
    },
  );

  test("filtro por modalidade não quebra a tela", async ({ page }) => {
    await page.goto("/agenda?tab=lista");
    await page.getByRole("button", { name: "Modalidade" }).click();
    await page.getByRole("option", { name: "Fisioterapia" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Nenhum evento encontrado.").or(page.getByRole("columnheader", { name: "Modalidade" })).first()).toBeVisible();
  });
});
