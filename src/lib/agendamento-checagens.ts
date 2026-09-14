/**
 * Checagens compartilhadas de agendamento (conflito de profissional, capacidade de sala,
 * habilitação do profissional na modalidade). Usadas pelas server actions de agendamento
 * (`src/actions/agendamentos.ts`) e pelo gerador da grade recorrente
 * (`src/actions/grade-recorrente.ts`). Módulo server-only (usa Prisma) — não importar em client.
 */
import { prisma } from "@/lib/prisma";
import { getConfigSalas } from "@/lib/salas-config";
import { escolherSalaComVaga, vagasTotais, type SalaCandidata } from "@/lib/sala-plano";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

/**
 * Dois eventos conflitam quando pertencem ao mesmo profissional (ou ambos não
 * têm profissional definido) e os intervalos [dataInicio, dataFim) se sobrepõem.
 * Eventos cancelados liberam o horário.
 */
export async function buscarConflito(params: {
  profissionalId: string | null;
  dataInicio: Date;
  dataFim: Date;
  excludeId?: string;
}) {
  return prisma.agendamento.findFirst({
    where: {
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      profissionalId: params.profissionalId,
      status: { not: "CANCELADO" },
      dataInicio: { lt: params.dataFim },
      dataFim: { gt: params.dataInicio },
    },
    select: { id: true, titulo: true, dataInicio: true },
  });
}

export function mensagemConflito(conflito: { titulo: string; dataInicio: Date }) {
  const horario = conflito.dataInicio.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `Conflito de horário com "${conflito.titulo}" (${horario}).`;
}

/**
 * Fisioterapia / Educação Física só aceitam como profissional quem está habilitado
 * a atender aquela modalidade. Avaliação e Terapia Manual não filtram.
 * Retorna a mensagem de erro ou `null`.
 */
export async function validarProfissionalModalidade(
  profissionalId: string | null,
  modalidade: ModalidadeAgendamento,
) {
  if (!profissionalId) return null;
  if (modalidade !== "FISIOTERAPIA" && modalidade !== "EDUCACAO_FISICA") return null;

  const profissional = await prisma.user.findUnique({
    where: { id: profissionalId },
    select: { atendeFisioterapia: true, atendeEducacaoFisica: true },
  });
  if (!profissional) return "Profissional não encontrado.";

  const habilitado =
    modalidade === "FISIOTERAPIA"
      ? profissional.atendeFisioterapia
      : profissional.atendeEducacaoFisica;
  return habilitado ? null : "Este profissional não atende essa modalidade.";
}

/**
 * Capacidade por modalidade somando todas as salas configuradas para ela
 * (`getConfigSalas`). Usada só para Avaliação/Terapia Manual, que têm sala fixa
 * (`MODALIDADE_SALA_PADRAO`) e não vêm de um Plano. Fisioterapia/Educação Física
 * (agendadas por um plano) usam `resolverSalaPlano`, que checa a capacidade da sala
 * específica do plano em vez de somar todas as salas da modalidade.
 * Capacidade é contada por paciente. Eventos que se sobrepõem no tempo e são da mesma
 * modalidade disputam a mesma capacidade. Retorna a mensagem de erro ou `null`.
 */
export async function verificarCapacidade(params: {
  modalidade: ModalidadeAgendamento;
  dataInicio: Date;
  dataFim: Date;
  quantidadePacientes: number;
  excludeId?: string;
}) {
  const configSalas = await getConfigSalas();
  const capacidade = configSalas[params.modalidade].capacidade;

  const concorrentes = await prisma.agendamento.findMany({
    where: {
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      modalidade: params.modalidade,
      status: { not: "CANCELADO" },
      dataInicio: { lt: params.dataFim },
      dataFim: { gt: params.dataInicio },
    },
    include: { pacientes: { select: { id: true } } },
  });

  const ocupadas = concorrentes.reduce(
    (soma, a) => soma + Math.max(a.pacientes.length, 1),
    0,
  );
  const novas = Math.max(params.quantidadePacientes, 1);

  if (ocupadas + novas > capacidade) {
    const sala = configSalas[params.modalidade].sala;
    const modalidadeLabel = MODALIDADE_AGENDAMENTO_LABEL[params.modalidade];
    return `${sala} lotada nesse horário para ${modalidadeLabel} (${ocupadas}/${capacidade} vagas ocupadas).`;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Sala pelo plano (Fisioterapia / Educação Física) — ver `src/lib/sala-plano.ts`
 * ------------------------------------------------------------------ */

/**
 * Salas candidatas de um plano atribuído, para uma modalidade — as `PlanoSala` do
 * `Plano` da atribuição, na ordem de `Sala.ordem`, só as com capacidade > 0 para essa
 * modalidade. Vazio para Avaliação/Terapia Manual (não usam esse cadastro) ou plano
 * ainda sem sala configurada.
 */
export async function getSalasCandidatasPlano(
  planoAtribuicaoId: string,
  modalidade: ModalidadeAgendamento,
): Promise<SalaCandidata[]> {
  if (modalidade !== "FISIOTERAPIA" && modalidade !== "EDUCACAO_FISICA") return [];

  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id: planoAtribuicaoId },
    select: {
      plano: {
        select: {
          salas: {
            select: {
              sala: {
                select: {
                  id: true,
                  nome: true,
                  ordem: true,
                  capacidadeEducacaoFisica: true,
                  capacidadeFisioterapia: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const salas = atribuicao?.plano?.salas.map((ps) => ps.sala) ?? [];
  return salas
    .map((s) => ({
      salaId: s.id,
      nome: s.nome,
      ordem: s.ordem,
      capacidade:
        modalidade === "FISIOTERAPIA" ? s.capacidadeFisioterapia : s.capacidadeEducacaoFisica,
    }))
    .filter((s) => s.capacidade > 0)
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ salaId, nome, capacidade }) => ({ salaId, nome, capacidade }));
}

/**
 * Pacientes concorrentes por sala, dentre uma lista de salas candidatas, num intervalo
 * de tempo — e quais dessas salas já estão em uso por OUTRA modalidade nesse mesmo
 * horário (`bloqueadas`). Uma sala com capacidade pra Fisioterapia e Educação Física
 * nunca atende as duas ao mesmo tempo: assim que tem 1 agendamento de uma modalidade
 * num horário, a sala fica exclusiva dela pra qualquer outro agendamento sobreposto,
 * mesmo que ainda "caiba" numericamente na capacidade da outra modalidade.
 */
async function ocupacaoPorSala(
  salaIds: string[],
  modalidade: ModalidadeAgendamento,
  dataInicio: Date,
  dataFim: Date,
  excludeId?: string,
): Promise<{ ocupacao: Record<string, number>; bloqueadas: Set<string> }> {
  if (salaIds.length === 0) return { ocupacao: {}, bloqueadas: new Set() };

  const concorrentes = await prisma.agendamento.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      salaId: { in: salaIds },
      status: { not: "CANCELADO" },
      dataInicio: { lt: dataFim },
      dataFim: { gt: dataInicio },
    },
    include: { pacientes: { select: { id: true } } },
  });

  const ocupacao: Record<string, number> = {};
  const bloqueadas = new Set<string>();
  for (const a of concorrentes) {
    if (!a.salaId) continue;
    if (a.modalidade !== modalidade) {
      bloqueadas.add(a.salaId);
      continue;
    }
    ocupacao[a.salaId] = (ocupacao[a.salaId] ?? 0) + Math.max(a.pacientes.length, 1);
  }
  return { ocupacao, bloqueadas };
}

/**
 * Vagas disponíveis de um plano numa modalidade/intervalo — soma das vagas livres
 * entre todas as salas candidatas do plano. Usado só para exibir disponibilidade
 * (calendário/grade de horários); a escolha real da sala é feita por `resolverSalaPlano`.
 */
export async function vagasDisponiveisPlano(params: {
  planoAtribuicaoId: string;
  modalidade: ModalidadeAgendamento;
  dataInicio: Date;
  dataFim: Date;
  excludeId?: string;
}) {
  const candidatas = await getSalasCandidatasPlano(params.planoAtribuicaoId, params.modalidade);
  const { ocupacao, bloqueadas } = await ocupacaoPorSala(
    candidatas.map((c) => c.salaId),
    params.modalidade,
    params.dataInicio,
    params.dataFim,
    params.excludeId,
  );
  const capacidade = candidatas.reduce((soma, c) => soma + c.capacidade, 0);
  return {
    capacidade,
    vagas: vagasTotais(candidatas, ocupacao, bloqueadas),
    semSalaConfigurada: candidatas.length === 0,
  };
}

export type ResolverSalaResultado =
  | { ok: true; salaId: string; nome: string }
  | { ok: false; error: string };

/**
 * Resolve qual sala usar para um agendamento de plano (Fisioterapia/Educação Física):
 * tenta as salas cadastradas no plano em ordem, e usa a primeira com vaga. Nunca cria
 * um agendamento sem sala — plano sem sala configurada, ou todas lotadas, retorna erro.
 */
export async function resolverSalaPlano(params: {
  planoAtribuicaoId: string;
  modalidade: ModalidadeAgendamento;
  dataInicio: Date;
  dataFim: Date;
  quantidadePacientes: number;
  excludeId?: string;
}): Promise<ResolverSalaResultado> {
  const modalidadeLabel = MODALIDADE_AGENDAMENTO_LABEL[params.modalidade];
  const candidatas = await getSalasCandidatasPlano(params.planoAtribuicaoId, params.modalidade);
  if (candidatas.length === 0) {
    return {
      ok: false,
      error: `Este plano não tem sala configurada para ${modalidadeLabel}. Configure em Planos → editar plano.`,
    };
  }

  const { ocupacao, bloqueadas } = await ocupacaoPorSala(
    candidatas.map((c) => c.salaId),
    params.modalidade,
    params.dataInicio,
    params.dataFim,
    params.excludeId,
  );
  const escolhida = escolherSalaComVaga(candidatas, ocupacao, params.quantidadePacientes, bloqueadas);
  if (!escolhida) {
    const nomes = candidatas.map((c) => c.nome).join(", ");
    const emUsoPorOutraModalidade = candidatas.every((c) => bloqueadas.has(c.salaId));
    return {
      ok: false,
      error: emUsoPorOutraModalidade
        ? `${nomes} já está em uso por outra modalidade nesse horário — uma sala não atende Fisioterapia e Educação Física ao mesmo tempo.`
        : `${nomes} lotada(s) nesse horário para ${modalidadeLabel}.`,
    };
  }
  return { ok: true, salaId: escolhida.salaId, nome: escolhida.nome };
}
