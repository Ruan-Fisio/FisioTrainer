export const DIAS_SEMANA = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const DIA_SEMANA_LABELS: Record<DiaSemana, string> = {
  SEGUNDA: "Segunda-feira",
  TERCA: "Terça-feira",
  QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export const DIA_SEMANA_LABELS_CURTO: Record<DiaSemana, string> = {
  SEGUNDA: "Seg",
  TERCA: "Ter",
  QUARTA: "Qua",
  QUINTA: "Qui",
  SEXTA: "Sex",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

export function ordenarPorDiaSemana<T extends { diaSemana: DiaSemana }>(
  itens: T[],
): T[] {
  return [...itens].sort(
    (a, b) => DIAS_SEMANA.indexOf(a.diaSemana) - DIAS_SEMANA.indexOf(b.diaSemana),
  );
}

export function formatarCarga(carga: number | string | null | undefined): string | null {
  if (carga == null) return null;
  const valor = Number(carga);
  return `${Number.isInteger(valor) ? valor : valor.toFixed(1).replace(".", ",")}kg`;
}

export function formatarDescanso(descanso: number | null | undefined): string | null {
  if (descanso == null) return null;
  return `${descanso}s`;
}
