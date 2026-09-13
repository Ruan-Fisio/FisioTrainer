/**
 * Regras puras de consumo de um plano atribuído. O teto real de atendimentos é o **total
 * do período** (`atendimentos × meses`), não o limite mensal — um plano MENSAL 4x que a
 * grade materializou como 3+1 (por falta de horário no mês) já está cheio.
 */

/** Slots vazios ("Disponível para agendar") que a aba deve mostrar num mês. */
export function slotsVaziosNoMes(params: {
  capacidadeMes: number | null;
  usadosNoMes: number;
  /** Quanto o plano inteiro ainda permite (null = plano sem limite). */
  disponivelNoPlano: number | null;
}): number {
  const capMes =
    params.capacidadeMes ?? params.usadosNoMes; // sem limite mensal → só os já usados
  const restanteMes = Math.max(capMes - params.usadosNoMes, 0);
  if (params.disponivelNoPlano == null) return restanteMes;
  return Math.max(0, Math.min(restanteMes, params.disponivelNoPlano));
}

/** Pode agendar mais 1 atendimento neste mês, respeitando limite mensal E total do plano? */
export function podeAgendarMais(params: {
  capacidadeMes: number | null;
  usadosNoMes: number;
  totalPlano: number | null;
  usadosNoPlano: number;
}): boolean {
  if (params.totalPlano != null && params.usadosNoPlano >= params.totalPlano) {
    return false;
  }
  if (
    params.capacidadeMes != null &&
    params.usadosNoMes >= params.capacidadeMes
  ) {
    return false;
  }
  return true;
}
