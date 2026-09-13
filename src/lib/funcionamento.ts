import type { DiaSemana } from "@/generated/prisma/enums";

/**
 * Dias da semana da clínica. `indice` casa com `Date#getUTCDay()` / `getDay()`
 * (0 = domingo). A ordem do array é a de exibição na tela de configuração
 * (segunda → domingo), não a numérica.
 */
export const DIA_SEMANA_INFO: { valor: DiaSemana; label: string; curto: string; indice: number }[] = [
  { valor: "SEGUNDA", label: "Segunda-feira", curto: "Seg", indice: 1 },
  { valor: "TERCA", label: "Terça-feira", curto: "Ter", indice: 2 },
  { valor: "QUARTA", label: "Quarta-feira", curto: "Qua", indice: 3 },
  { valor: "QUINTA", label: "Quinta-feira", curto: "Qui", indice: 4 },
  { valor: "SEXTA", label: "Sexta-feira", curto: "Sex", indice: 5 },
  { valor: "SABADO", label: "Sábado", curto: "Sáb", indice: 6 },
  { valor: "DOMINGO", label: "Domingo", curto: "Dom", indice: 0 },
];

export const DIA_SEMANA_INDICE: Record<DiaSemana, number> = Object.fromEntries(
  DIA_SEMANA_INFO.map((d) => [d.valor, d.indice]),
) as Record<DiaSemana, number>;

export const TODOS_DIAS_SEMANA = DIA_SEMANA_INFO.map((d) => d.valor);

/** Dia da semana (0 = domingo) da data-calendário "YYYY-MM-DD", independente do fuso do processo. */
export function diaSemanaDeYmd(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}
