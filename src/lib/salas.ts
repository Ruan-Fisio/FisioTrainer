import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

export type ConfigSala = { sala: string; capacidade: number };

/**
 * Valores padrão de sala/capacidade por modalidade. Servem de fallback quando uma
 * modalidade ainda não tem `SalaServico` cadastrado (banco novo, seed pendente) —
 * a configuração real vem do banco via `getConfigSalas()` (`src/lib/salas-config.ts`).
 * Sala 1 é compartilhada entre Educação Física e Fisioterapia, cada uma com seu limite.
 */
export const MODALIDADE_SALA_PADRAO: Record<ModalidadeAgendamento, ConfigSala> = {
  EDUCACAO_FISICA: { sala: "Sala 1 - Cinesioterapia", capacidade: 5 },
  FISIOTERAPIA: { sala: "Sala 1 - Cinesioterapia", capacidade: 4 },
  AVALIACAO: { sala: "Sala 2 - Avaliação", capacidade: 1 },
  TERAPIA_MANUAL: { sala: "Sala 3 - Terapias Manuais", capacidade: 2 },
  // Nunca usado de fato: Serviço customizado (OUTRO) resolve sala via `SalaServico`/
  // `resolverSalaServico`, não por `getConfigSalas`/`verificarCapacidade`. Presente só
  // para satisfazer o `Record<ModalidadeAgendamento, ...>`.
  OUTRO: { sala: "", capacidade: 0 },
};

/** Modalidades com grade fixa de horários (configurável em Configurações). */
export const MODALIDADES_COM_HORARIO_FIXO: ModalidadeAgendamento[] = [
  "EDUCACAO_FISICA",
  "FISIOTERAPIA",
];

export function temHorarioFixo(modalidade: ModalidadeAgendamento) {
  return MODALIDADES_COM_HORARIO_FIXO.includes(modalidade);
}

/** Duração padrão (minutos) de um atendimento de horário livre (sem grade fixa) —
 * Avaliação/Terapia Manual na grade recorrente, e agendamento manual de Serviço. */
export const DURACAO_HORARIO_LIVRE_MIN = 50;
