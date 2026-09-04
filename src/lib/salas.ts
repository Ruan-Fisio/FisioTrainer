import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

/**
 * Regra de negócio fixa da clínica: cada modalidade de atendimento ocorre em uma sala
 * específica com capacidade própria (Sala 1 é compartilhada entre Educação Física e
 * Fisioterapia, mas cada modalidade tem seu próprio limite de pessoas no mesmo horário).
 */
export const MODALIDADE_SALA: Record<
  ModalidadeAgendamento,
  { sala: string; capacidade: number }
> = {
  EDUCACAO_FISICA: { sala: "Sala 1 - Cinesioterapia", capacidade: 5 },
  FISIOTERAPIA: { sala: "Sala 1 - Cinesioterapia", capacidade: 4 },
  AVALIACAO: { sala: "Sala 2 - Avaliação", capacidade: 1 },
  TERAPIA_MANUAL: { sala: "Sala 3 - Terapias Manuais", capacidade: 2 },
};

/** Modalidades com grade fixa de horários (configurável em Configurações). */
export const MODALIDADES_COM_HORARIO_FIXO: ModalidadeAgendamento[] = [
  "EDUCACAO_FISICA",
  "FISIOTERAPIA",
];

export function temHorarioFixo(modalidade: ModalidadeAgendamento) {
  return MODALIDADES_COM_HORARIO_FIXO.includes(modalidade);
}
