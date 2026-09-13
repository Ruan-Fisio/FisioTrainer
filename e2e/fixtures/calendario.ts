import type { Page } from "@playwright/test";

/**
 * Primeiro dia "disponível" (borda azul) na grade de `CalendarioDisponibilidade`
 * (wizards de agendamento assistido e remarcação) — dias sem grade/lotados/passados
 * ficam com borda vermelha e `disabled`. Os dias não têm rótulo acessível único (só o
 * número), então miramos na classe de cor que o componente já usa pra indicar "disponível".
 */
export function primeiroDiaDisponivel(page: Page) {
  return page.locator("button.border-blue-500").first();
}

/**
 * Mesma ideia, pro grid de horários (`GradeHorariosDisponiveis`) — usa exatamente as
 * mesmas classes de "disponível", então o seletor é idêntico.
 */
export const primeiroHorarioDisponivel = primeiroDiaDisponivel;

/**
 * Avança o calendário de disponibilidade (`CalendarioDisponibilidade`) pro mês seguinte —
 * usado quando o teste precisa de um horário garantidamente longe no futuro (ex. a regra
 * das 2h de antecedência pra desmarcar), já que "hoje" pode ter só horários que já passaram.
 */
export async function irParaProximoMes(page: Page) {
  await page.getByRole("button", { name: "Próximo mês" }).click();
}
