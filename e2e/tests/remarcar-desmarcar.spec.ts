import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { criarPlano } from "../fixtures/planos";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import {
  irParaProximoMes,
  primeiroDiaDisponivel,
  primeiroHorarioDisponivel,
} from "../fixtures/calendario";
import { criarProfissional } from "../fixtures/usuarios";
import { criarSala } from "../fixtures/salas";

/**
 * Agenda 1 atendimento pelo wizard assistido e volta pra aba Agendamentos.
 * `mesSeguinte` força o dia escolhido pro mês seguinte — garante um horário bem longe no
 * futuro (a regra das 2h de antecedência pra desmarcar não pode depender de "hoje" ter
 * sobrado algum horário ainda não passado).
 */
async function agendarUmAtendimento(
  page: import("@playwright/test").Page,
  pacienteId: string,
  planoNome: string,
  profissionalNome: string,
  { mesSeguinte = false }: { mesSeguinte?: boolean } = {},
) {
  await page.goto(`/pacientes/${pacienteId}?tab=agendamentos`);
  await page.getByRole("button", { name: "Agendamentos" }).click();
  await page.getByRole("button", { name: new RegExp(planoNome) }).click();
  await page.getByLabel("Profissional").selectOption({ label: profissionalNome });
  await page.getByRole("button", { name: "Continuar" }).click();
  if (mesSeguinte) await irParaProximoMes(page);
  await primeiroDiaDisponivel(page).click();
  await primeiroHorarioDisponivel(page).click();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByText("Agendamento criado com sucesso.")).toBeVisible();
}

test.describe("remarcar (clínica)", () => {
  test("remarca um atendimento e consome 1 crédito do plano", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    const plano = await criarPlano(page, {
      atendimentos: "4",
      creditosRemarcacao: "2",
      salas: [sala],
    });
    await atribuirPlano(page, paciente.id, plano.id);
    const profissional = await criarProfissional(page, ["Fisioterapia"]);
    await agendarUmAtendimento(page, paciente.id, plano.nome, profissional.nome);

    await expect(page.getByText("Remarcações: 0 de 2 neste mês")).toBeVisible();

    await page.getByRole("button", { name: "Remarcar" }).click();
    await primeiroDiaDisponivel(page).click();
    await primeiroHorarioDisponivel(page).click();
    await page
      .getByLabel("Justificativa da remarcação")
      .fill("Paciente pediu pra trocar o horário.");
    await page.getByRole("button", { name: "Confirmar novo horário" }).click();

    await expect(page.getByText("Atendimento remarcado com sucesso.")).toBeVisible();
    await expect(page.getByText("Remarcações: 1 de 2 neste mês")).toBeVisible();
  });

  test("sem saldo de remarcação, pede confirmação antes de remarcar assim mesmo", async ({
    page,
  }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    // 0 créditos de remarcação — a 1ª remarcação já estoura o saldo.
    const plano = await criarPlano(page, {
      atendimentos: "4",
      creditosRemarcacao: "0",
      salas: [sala],
    });
    await atribuirPlano(page, paciente.id, plano.id);
    const profissional = await criarProfissional(page, ["Fisioterapia"]);
    await agendarUmAtendimento(page, paciente.id, plano.nome, profissional.nome);

    await page.getByRole("button", { name: "Remarcar" }).click();
    await primeiroDiaDisponivel(page).click();
    await primeiroHorarioDisponivel(page).click();
    await page.getByLabel("Justificativa da remarcação").fill("Sem saldo, testando aviso.");
    await page.getByRole("button", { name: "Confirmar novo horário" }).click();

    await expect(
      page.getByText("Este plano está sem créditos de remarcação neste mês."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remarcar assim mesmo" }).click();

    await expect(page.getByText("Atendimento remarcado com sucesso.")).toBeVisible();
  });
});

test.describe("desmarcar (portal do paciente)", () => {
  test("paciente desmarca pelo portal dentro do prazo de 2h e o crédito é debitado", async ({
    page,
    browser,
  }) => {
    const paciente = await criarPaciente(page);
    const sala = await criarSala(page);
    const plano = await criarPlano(page, {
      atendimentos: "4",
      creditosRemarcacao: "2",
      salas: [sala],
    });
    await atribuirPlano(page, paciente.id, plano.id);
    const profissional = await criarProfissional(page, ["Fisioterapia"]);
    await agendarUmAtendimento(page, paciente.id, plano.nome, profissional.nome, {
      mesSeguinte: true,
    });

    // Gera o link público (sem login) e extrai a URL do campo readonly.
    await page.goto(`/pacientes/${paciente.id}`);
    await page.getByRole("button", { name: "Compartilhar acesso" }).click();
    const url = await page.locator("input[readonly]").inputValue();
    await page.getByRole("button", { name: "Fechar" }).click();

    // Contexto novo, sem sessão — o portal não exige login.
    const portalContext = await browser.newContext();
    const portal = await portalContext.newPage();
    try {
      await portal.goto(url);
      await portal.getByRole("tab", { name: "Agendamentos" }).click();
      // O atendimento foi marcado pro mês seguinte (`mesSeguinte`) — a aba abre no mês
      // atual por padrão.
      await portal.getByRole("button", { name: "Próximo mês" }).click();

      const desmarcar = portal.getByRole("button", { name: "Desmarcar" }).first();
      // O agendamento acabou de ser criado no futuro — dentro do prazo de 2h.
      await desmarcar.click();
      await portal
        .getByLabel("Por que você precisa desmarcar?")
        .fill("Não vou conseguir ir, preciso desmarcar.");
      await portal.getByRole("button", { name: "Desmarcar atendimento" }).click();

      await expect(
        portal.getByText("Atendimento desmarcado. Você já pode reagendar neste mês."),
      ).toBeVisible();
      // O paciente NUNCA vê o saldo de créditos, mesmo depois de consumir um.
      await expect(portal.getByText(/créditos|remarcaç/i)).not.toBeVisible();
    } finally {
      await portalContext.close();
    }

    // Do lado da clínica, o crédito (origem PACIENTE) já aparece debitado.
    await page.goto(`/pacientes/${paciente.id}?tab=agendamentos`);
    await expect(page.getByText("Remarcações: 1 de 2 neste mês")).toBeVisible();
  });
});
