/**
 * Créditos de remarcação de um plano. Cada plano tem um máximo de créditos por
 * mês-calendário (`Plano.creditosRemarcacao`, copiado para `PlanoAtribuicao`); cada
 * remarcação de um atendimento ligado ao plano — o paciente desmarcando pelo portal
 * dentro do prazo, ou a clínica remarcando pelo wizard "Remarcar" — consome 1 crédito
 * (1 linha em `CreditoRemarcacao`). O saldo reseta na virada do mês. Helpers puros;
 * a contagem do mês vive em `src/actions/agendamentos.ts` (usa `datas-brasilia`).
 */

/** Quantos créditos ainda restam no mês (nunca negativo). */
export function creditosDisponiveis(max: number, usados: number): number {
  return Math.max(max - usados, 0);
}

/** `true` quando o plano já não tem crédito de remarcação neste mês. */
export function semCreditos(max: number, usados: number): boolean {
  return usados >= max;
}
