import type { ModalidadeAgendamento, TipoPlano } from "@/generated/prisma/enums";

export type FiltrosAgendamentoComuns = {
  profissionalIds?: string[];
  modalidades?: string[];
  salaIds?: string[];
  servicoIds?: string[];
  planoHibrido?: boolean;
};

/**
 * Cláusulas `where` de `Agendamento` compartilhadas por toda listagem/contagem que aceita
 * os filtros comuns (profissional, modalidade, sala, serviço, plano híbrido) — usada tanto
 * pelas actions de `/agenda` (`listAgendamentos`/`listAgendamentosPorIntervalo`) quanto
 * pelo card "Meus compromissos" do dashboard (`getProximosAgendamentos`/`getContagensAgenda`).
 * Puro (sem Prisma), só monta o objeto — cada action decide o `include`/demais campos do `where`.
 */
export function whereFiltrosComuns(filters: FiltrosAgendamentoComuns) {
  return {
    ...(filters.profissionalIds && filters.profissionalIds.length > 0
      ? { profissionalId: { in: filters.profissionalIds } }
      : {}),
    ...(filters.modalidades && filters.modalidades.length > 0
      ? { modalidade: { in: filters.modalidades as ModalidadeAgendamento[] } }
      : {}),
    ...(filters.salaIds && filters.salaIds.length > 0
      ? { salaId: { in: filters.salaIds } }
      : {}),
    ...(filters.servicoIds && filters.servicoIds.length > 0
      ? { servicoId: { in: filters.servicoIds } }
      : {}),
    ...(filters.planoHibrido
      ? {
          planoAtribuicao: {
            plano: {
              tipos: {
                hasEvery: ["FISIOTERAPIA", "EDUCACAO_FISICA"] as TipoPlano[],
              },
            },
          },
        }
      : {}),
  };
}
