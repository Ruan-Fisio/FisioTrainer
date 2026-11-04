/**
 * Exclusão lógica de paciente: `Paciente.excluidoEm` preenchido. Nada é apagado, nem no
 * banco nem no R2. Puro, sem Prisma. Ver docs/ops.md.
 */

/** Filtro para qualquer listagem geral: `where: { paciente: PACIENTE_ATIVO }`. */
export const PACIENTE_ATIVO = { excluidoEm: null };

/**
 * Agendamento tem vários pacientes, ou nenhum (compromisso avulso). Só sai das listagens
 * quando tem pacientes e todos foram excluídos.
 */
export const AGENDAMENTO_VISIVEL = {
  NOT: {
    AND: [
      { pacientes: { some: {} } },
      { pacientes: { every: { excluidoEm: { not: null } } } },
    ],
  },
};

/**
 * O que fazer com os agendamentos futuros de quem foi excluído: se era o único paciente,
 * cancela (libera vaga e horário); em atendimento de grupo, só tira esse paciente.
 */
export function planejarAgendamentosDaExclusao(
  agendamentos: { id: string; totalPacientes: number }[],
) {
  return {
    cancelar: agendamentos.filter((a) => a.totalPacientes <= 1).map((a) => a.id),
    desvincular: agendamentos.filter((a) => a.totalPacientes > 1).map((a) => a.id),
  };
}
