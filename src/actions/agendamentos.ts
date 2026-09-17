"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { combinarDataHora } from "@/lib/validations/agendamento";
import { temHorarioFixo } from "@/lib/salas";
import { getConfigSalas } from "@/lib/salas-config";
import { getConfigFuncionamento, validarFuncionamento } from "@/lib/funcionamento-config";
import { diaSemanaDeYmd } from "@/lib/funcionamento";
import { pacientePodeDesmarcar } from "@/lib/agendamento-cancelamento";
import { creditosDisponiveis, semCreditos } from "@/lib/remarcacao-creditos";
import { totalAtendimentosPlano } from "@/lib/plano-renovacao";
import { dataBrasilia, fimDoMes, inicioDoMes } from "@/lib/datas-brasilia";
import { formatarDataHora, formatarMes } from "@/lib/format";
import { calcularTaxaProfissional, gerarValoresParcelas } from "@/lib/planos";
import { agendamentoServicoPagamentoSchema } from "@/lib/validations/servico";
import {
  buscarConflito,
  mensagemConflito,
  validarProfissionalModalidade,
  validarProfissionalServico,
  verificarCapacidade,
  getSalasCandidatasPlano,
  vagasDisponiveisPlano,
  resolverSalaPlano,
  resolverSalaServico,
} from "@/lib/agendamento-checagens";
import { vagasTotais } from "@/lib/sala-plano";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

const PAGE_SIZE = 10;

const includePadrao = {
  pacientes: { select: { id: true, nome: true } },
  profissional: { select: { id: true, name: true } },
  sala: { select: { id: true, nome: true } },
  servico: { select: { id: true, nome: true } },
};

export async function listAgendamentos(
  filters: {
    pacienteIds?: string[];
    profissionalIds?: string[];
    modalidades?: string[];
    status?: string[];
    de?: string;
    ate?: string;
  },
  page: number,
) {
  const dataFilter: { gte?: Date; lte?: Date } = {};
  if (filters.de) dataFilter.gte = new Date(`${filters.de}T00:00:00`);
  if (filters.ate) dataFilter.lte = new Date(`${filters.ate}T23:59:59`);

  const where = {
    ...(filters.pacienteIds && filters.pacienteIds.length > 0
      ? { pacientes: { some: { id: { in: filters.pacienteIds } } } }
      : {}),
    ...(filters.profissionalIds && filters.profissionalIds.length > 0
      ? { profissionalId: { in: filters.profissionalIds } }
      : {}),
    ...(filters.modalidades && filters.modalidades.length > 0
      ? { modalidade: { in: filters.modalidades as ModalidadeAgendamento[] } }
      : {}),
    ...(filters.status && filters.status.length > 0
      ? {
          status: {
            in: filters.status as (
              | "AGENDADO"
              | "COMPARECEU"
              | "FALTOU"
              | "CANCELADO"
            )[],
          },
        }
      : {}),
    ...(dataFilter.gte || dataFilter.lte ? { dataInicio: dataFilter } : {}),
  };

  const [agendamentos, total] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      orderBy: { dataInicio: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: includePadrao,
    }),
    prisma.agendamento.count({ where }),
  ]);

  return {
    agendamentos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listAgendamentosPorIntervalo(intervalo: {
  inicio: Date;
  fim: Date;
  profissionalIds?: string[];
}) {
  return prisma.agendamento.findMany({
    where: {
      dataInicio: { lte: intervalo.fim },
      dataFim: { gte: intervalo.inicio },
      ...(intervalo.profissionalIds && intervalo.profissionalIds.length > 0
        ? { profissionalId: { in: intervalo.profissionalIds } }
        : {}),
    },
    orderBy: { dataInicio: "asc" },
    include: includePadrao,
  });
}

/** Eventos do profissional (ou sem profissional) num dia, para montar um seletor de horários livres. */
export async function getAgendamentosDoDia(
  data: string,
  profissionalId: string | null,
  excludeId?: string,
) {
  const inicio = new Date(`${data}T00:00:00`);
  const fim = new Date(`${data}T23:59:59`);

  return prisma.agendamento.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      profissionalId,
      status: { not: "CANCELADO" },
      dataInicio: { lte: fim },
      dataFim: { gte: inicio },
    },
    select: { id: true, titulo: true, dataInicio: true, dataFim: true },
    orderBy: { dataInicio: "asc" },
  });
}

/**
 * Vagas disponíveis em cada horário pré-configurado da modalidade, numa data. Usado para
 * filtrar no formulário quais horários ainda têm capacidade na sala daquela modalidade.
 *
 * Fisioterapia/Educação Física são sempre agendadas por um plano: `planoAtribuicaoId`
 * escopa a capacidade só às salas cadastradas naquele plano (`resolverSalaPlano`), em
 * vez de somar todas as salas da modalidade. Avaliação/Terapia Manual (sem plano) usam
 * a sala fixa (`getConfigSalas`).
 */
export async function getDisponibilidadeHorarios(
  data: string,
  modalidade: ModalidadeAgendamento,
  excludeId?: string,
  planoAtribuicaoId?: string,
) {
  const { diasAbertos, feriados } = await getConfigFuncionamento();
  if (!diasAbertos.has(diaSemanaDeYmd(data)) || feriados.has(data)) return [];

  const horarios = await prisma.horarioAtendimento.findMany({
    where: { modalidade, ativo: true },
    orderBy: { ordem: "asc" },
  });
  if (horarios.length === 0) return [];

  const usaPlano = planoAtribuicaoId != null;

  if (usaPlano) {
    return Promise.all(
      horarios.map(async (h) => {
        const inicioSlot = combinarDataHora(data, h.horario);
        const fimSlot = new Date(inicioSlot.getTime() + h.duracaoMin * 60000);
        const { capacidade, vagas } = await vagasDisponiveisPlano({
          planoAtribuicaoId,
          modalidade,
          dataInicio: inicioSlot,
          dataFim: fimSlot,
          excludeId,
        });
        return {
          horario: h.horario,
          duracaoMin: h.duracaoMin,
          capacidade,
          ocupadas: capacidade - vagas,
          vagas,
        };
      }),
    );
  }

  const capacidade = (await getConfigSalas())[modalidade].capacidade;
  const inicioDia = new Date(`${data}T00:00:00`);
  const fimDia = new Date(`${data}T23:59:59`);

  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      modalidade,
      status: { not: "CANCELADO" },
      dataInicio: { lte: fimDia },
      dataFim: { gte: inicioDia },
    },
    include: { pacientes: { select: { id: true } } },
  });

  return horarios.map((h) => {
    const inicioSlot = combinarDataHora(data, h.horario);
    const fimSlot = new Date(inicioSlot.getTime() + h.duracaoMin * 60000);
    const ocupadas = agendamentosDoDia
      .filter((a) => a.dataInicio < fimSlot && a.dataFim > inicioSlot)
      .reduce((soma, a) => soma + Math.max(a.pacientes.length, 1), 0);

    return {
      horario: h.horario,
      duracaoMin: h.duracaoMin,
      capacidade,
      ocupadas,
      vagas: Math.max(capacidade - ocupadas, 0),
    };
  });
}

function revalidar(pacienteIds: string[]) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  for (const pacienteId of pacienteIds) {
    revalidatePath(`/pacientes/${pacienteId}`);
  }
}

/** Marcação rápida de comparecimento/falta a partir do dashboard, sem abrir o formulário completo. */
export async function atualizarStatusAgendamento(
  id: string,
  status: "COMPARECEU" | "FALTOU" | "AGENDADO",
) {
  const agendamento = await prisma.agendamento.update({
    where: { id },
    data: { status },
    include: { pacientes: { select: { id: true } } },
  });
  revalidar(agendamento.pacientes.map((p) => p.id));
}

export type RemarcarActionState = {
  error?: string;
  success?: boolean;
  /** Plano sem créditos de remarcação no mês: a clínica precisa confirmar (reenviar com `forcar`). */
  requiresConfirmacao?: boolean;
};

/**
 * Remarca um evento para nova data/horário, preservando duração, pacientes e demais dados.
 * Se o evento estiver ligado a um plano, exige `justificativa` e consome 1 crédito de
 * remarcação do plano no mês; sem saldo, retorna `requiresConfirmacao` até que a clínica
 * reenvie com `forcar: true` (aí remarca mesmo assim, deixando o mês no vermelho).
 */
export async function remarcarAgendamento(
  id: string,
  novaData: string,
  novaHoraInicio: string,
  novaHoraFim: string,
  justificativa?: string,
  forcar = false,
): Promise<RemarcarActionState> {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      pacientes: { select: { id: true } },
      planoAtribuicao: { select: { id: true, creditosRemarcacao: true } },
    },
  });
  if (!agendamento) return { error: "Evento não encontrado." };

  const motivo = justificativa?.trim() ?? "";
  if (agendamento.planoAtribuicao && motivo.length < 3) {
    return { error: "Informe a justificativa da remarcação." };
  }
  if (agendamento.planoAtribuicao && !forcar) {
    const usados = await contarCreditosRemarcacaoNoMes(agendamento.planoAtribuicao.id);
    if (semCreditos(agendamento.planoAtribuicao.creditosRemarcacao, usados)) {
      return { requiresConfirmacao: true };
    }
  }

  const dataInicio = combinarDataHora(novaData, novaHoraInicio);
  const dataFim = combinarDataHora(novaData, novaHoraFim);

  if (dataFim <= dataInicio) {
    return { error: "Horário de término deve ser depois do início." };
  }

  const erroFuncionamento = await validarFuncionamento(dataInicio);
  if (erroFuncionamento) return { error: erroFuncionamento };

  const conflito = await buscarConflito({
    profissionalId: agendamento.profissionalId,
    dataInicio,
    dataFim,
    excludeId: id,
  });
  if (conflito) return { error: mensagemConflito(conflito) };

  let salaId: string | null = null;
  if (agendamento.planoAtribuicao) {
    const sala = await resolverSalaPlano({
      planoAtribuicaoId: agendamento.planoAtribuicao.id,
      modalidade: agendamento.modalidade,
      dataInicio,
      dataFim,
      quantidadePacientes: agendamento.pacientes.length,
      excludeId: id,
    });
    if (!sala.ok) return { error: sala.error };
    salaId = sala.salaId;
  } else {
    const semCapacidade = await verificarCapacidade({
      modalidade: agendamento.modalidade,
      dataInicio,
      dataFim,
      quantidadePacientes: agendamento.pacientes.length,
      excludeId: id,
    });
    if (semCapacidade) return { error: semCapacidade };
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: { id },
      data: { dataInicio, dataFim, status: "AGENDADO", salaId },
    });
    if (agendamento.planoAtribuicao) {
      await tx.creditoRemarcacao.create({
        data: {
          planoAtribuicaoId: agendamento.planoAtribuicao.id,
          agendamentoId: id,
          origem: "CLINICA",
          justificativa: motivo,
        },
      });
    }
  });

  revalidar(agendamento.pacientes.map((p) => p.id));
  return { success: true };
}

export type DesmarcarAgendamentoState = { error?: string; success?: boolean };

/**
 * Cancelamento feito pelo próprio paciente (portal público via link de token). Só permitido
 * até 2h antes do início (pacientePodeDesmarcar). Fora do prazo NÃO cancela — a ausência é
 * registrada como falta pela clínica no fluxo normal. Ao cancelar, a vaga do plano no mês
 * reabre automaticamente pela contagem (contarAgendamentosNoMes ignora status CANCELADO) e o
 * horário na sala volta a ficar livre. O lado da clínica não passa por aqui.
 */
export async function desmarcarAgendamentoPeloPaciente(
  agendamentoId: string,
  pacienteId: string,
  justificativa: string,
): Promise<DesmarcarAgendamentoState> {
  const motivo = justificativa?.trim() ?? "";
  if (motivo.length < 3) {
    return { error: "Descreva o motivo da remarcação para continuar." };
  }

  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      pacientes: { select: { id: true } },
      planoAtribuicao: { select: { id: true, creditosRemarcacao: true } },
    },
  });
  if (!ag) return { error: "Atendimento não encontrado." };
  if (!ag.pacientes.some((p) => p.id === pacienteId)) {
    return { error: "Este atendimento não pertence a você." };
  }
  if (ag.status !== "AGENDADO") {
    return { error: "Este atendimento não pode mais ser desmarcado." };
  }
  if (!pacientePodeDesmarcar(ag.dataInicio)) {
    return {
      error:
        "Só é possível desmarcar até 2 horas antes do horário. Como o prazo já passou, " +
        "a ausência será registrada como falta.",
    };
  }

  if (ag.planoAtribuicao) {
    const usados = await contarCreditosRemarcacaoNoMes(ag.planoAtribuicao.id);
    if (semCreditos(ag.planoAtribuicao.creditosRemarcacao, usados)) {
      return {
        error:
          "Não é possível desmarcar por aqui neste momento. Entre em contato com a clínica.",
      };
    }
  }

  const carimbo = formatarDataHora(new Date());
  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: { id: agendamentoId },
      data: {
        status: "CANCELADO",
        observacao: [
          ag.observacao,
          `Desmarcado pelo paciente pelo portal em ${carimbo}. Motivo: ${motivo}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
    if (ag.planoAtribuicao) {
      await tx.creditoRemarcacao.create({
        data: {
          planoAtribuicaoId: ag.planoAtribuicao.id,
          agendamentoId,
          origem: "PACIENTE",
          justificativa: motivo,
        },
      });
    }
  });

  revalidar(ag.pacientes.map((p) => p.id));
  return { success: true };
}

/**
 * Créditos de remarcação já consumidos por uma atribuição de plano no mês-calendário
 * (Brasília) que contém `ref`. Cada linha de `CreditoRemarcacao` = 1 crédito.
 */
async function contarCreditosRemarcacaoNoMes(
  planoAtribuicaoId: string,
  ref: Date = new Date(),
) {
  return prisma.creditoRemarcacao.count({
    where: {
      planoAtribuicaoId,
      createdAt: { gte: inicioDoMes(ref), lte: fimDoMes(ref) },
    },
  });
}

/* ------------------------------------------------------------------ *
 * Agendamento assistido por plano (wizard na tela do paciente)
 * ------------------------------------------------------------------ */

const MODALIDADE_POR_TIPO_PLANO: Record<string, ModalidadeAgendamento> = {
  EDUCACAO_FISICA: "EDUCACAO_FISICA",
  FISIOTERAPIA: "FISIOTERAPIA",
};

/** Planos ativos do paciente (uma opção por modalidade coberta) + profissionais para o wizard. */
export async function getDadosAgendamentoAssistido(pacienteId: string) {
  const [atribuicoes, profissionais] = await Promise.all([
    prisma.planoAtribuicao.findMany({
      where: { pacienteId, status: "ATIVO" },
      orderBy: { createdAt: "desc" },
      include: { plano: { select: { tipos: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        atendeFisioterapia: true,
        atendeEducacaoFisica: true,
      },
    }),
  ]);

  const opcoesComTipo = atribuicoes.flatMap((a) => {
    const tipos = a.plano?.tipos ?? [];
    return tipos
      .filter((t) => MODALIDADE_POR_TIPO_PLANO[t])
      .map((t) => ({ atribuicao: a, modalidade: MODALIDADE_POR_TIPO_PLANO[t] }));
  });

  const opcoes = await Promise.all(
    opcoesComTipo.map(async ({ atribuicao: a, modalidade }) => {
      const candidatas = await getSalasCandidatasPlano(a.id, modalidade);
      return {
        atribuicaoId: a.id,
        planoNome: a.planoNome,
        modalidade,
        atendimentos: a.atendimentos,
        periodicidade: a.periodicidade,
        total: totalAtendimentosPlano(a.atendimentos, a.periodicidade),
        sala:
          candidatas.length > 0
            ? candidatas.map((c) => c.nome).join(", ")
            : "sem sala configurada",
      };
    }),
  );

  return { opcoes, profissionais };
}

/** Quantos agendamentos daquela atribuição já existem no mês (regra: "Nx" = N por mês). */
async function contarAgendamentosNoMes(
  planoAtribuicaoId: string,
  inicioMes: Date,
  fimMes: Date,
  excludeId?: string,
) {
  return prisma.agendamento.count({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      planoAtribuicaoId,
      status: { not: "CANCELADO" },
      dataInicio: { gte: inicioMes, lte: fimMes },
    },
  });
}

/**
 * Total de agendamentos não-cancelados da atribuição em TODO o plano (sem filtro de mês).
 * É o teto real: um plano MENSAL 4x = 4 atendimentos no total; TRIMESTRAL Nx = N×3.
 */
async function contarAgendamentosDaAtribuicao(
  planoAtribuicaoId: string,
  excludeId?: string,
) {
  return prisma.agendamento.count({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      planoAtribuicaoId,
      status: { not: "CANCELADO" },
    },
  });
}

export type DiaDisponibilidade = {
  data: string;
  temHorarios: boolean;
  vagas: number;
  lotado: boolean;
};

/**
 * Disponibilidade dia a dia de um mês para os wizards de agendamento/remarcação.
 * Para modalidades com grade fixa soma as vagas de cada horário pré-configurado;
 * para as de horário livre marca todo dia como disponível (o passo do horário faz
 * a checagem fina). `excludeId` tira o próprio evento da conta (usado na remarcação).
 *
 * `planoAtribuicaoId` (Fisioterapia/Educação Física) escopa a capacidade só às salas
 * cadastradas naquele plano — sem ele (ou plano sem sala configurada), cai na sala fixa
 * por modalidade (`getConfigSalas`), usada por Avaliação/Terapia Manual.
 */
async function calcularDiasDisponiveis(
  modalidade: ModalidadeAgendamento,
  ano: number,
  mes: number,
  excludeId?: string,
  planoAtribuicaoId?: string,
): Promise<DiaDisponibilidade[]> {
  const inicioMes = dataBrasilia(ano, mes);
  const fimMes = fimDoMes(inicioMes);
  const totalDias = new Date(ano, mes, 0).getDate();

  const dataStrDe = (dia: number) =>
    `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const horarios = temHorarioFixo(modalidade)
    ? await prisma.horarioAtendimento.findMany({
        where: { modalidade, ativo: true },
        orderBy: { ordem: "asc" },
      })
    : [];

  const candidatas = planoAtribuicaoId
    ? await getSalasCandidatasPlano(planoAtribuicaoId, modalidade)
    : [];
  const capacidadeFixa = planoAtribuicaoId
    ? 0
    : (await getConfigSalas())[modalidade].capacidade;
  const { diasAbertos, feriados } = await getConfigFuncionamento();

  const agendamentosDoMes = await prisma.agendamento.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      modalidade,
      status: { not: "CANCELADO" },
      dataInicio: { lte: fimMes },
      dataFim: { gte: inicioMes },
    },
    include: { pacientes: { select: { id: true } } },
  });

  return Array.from({ length: totalDias }, (_, i) => {
    const dataStr = dataStrDe(i + 1);

    const fechado =
      !diasAbertos.has(diaSemanaDeYmd(dataStr)) || feriados.has(dataStr);
    if (fechado) {
      return { data: dataStr, temHorarios: false, vagas: 0, lotado: true };
    }

    if (horarios.length === 0) {
      // horário livre: dia sempre disponível, o passo seguinte filtra
      return { data: dataStr, temHorarios: true, vagas: 1, lotado: false };
    }

    let vagasDia = 0;
    for (const h of horarios) {
      const inicioSlot = combinarDataHora(dataStr, h.horario);
      const fimSlot = new Date(inicioSlot.getTime() + h.duracaoMin * 60000);
      const concorrentes = agendamentosDoMes.filter(
        (a) => a.dataInicio < fimSlot && a.dataFim > inicioSlot,
      );

      if (planoAtribuicaoId) {
        const ocupadasPorSala: Record<string, number> = {};
        for (const a of concorrentes) {
          if (!a.salaId) continue;
          ocupadasPorSala[a.salaId] =
            (ocupadasPorSala[a.salaId] ?? 0) + Math.max(a.pacientes.length, 1);
        }
        vagasDia += vagasTotais(candidatas, ocupadasPorSala);
      } else {
        const ocupadas = concorrentes.reduce(
          (soma, a) => soma + Math.max(a.pacientes.length, 1),
          0,
        );
        vagasDia += Math.max(capacidadeFixa - ocupadas, 0);
      }
    }

    return { data: dataStr, temHorarios: true, vagas: vagasDia, lotado: vagasDia === 0 };
  });
}

/** Disponibilidade do mês para o wizard de remarcação (sem regra de plano). */
export async function getDisponibilidadeMes(params: {
  modalidade: ModalidadeAgendamento;
  ano: number;
  mes: number;
  excludeId?: string;
  planoAtribuicaoId?: string;
}) {
  return {
    dias: await calcularDiasDisponiveis(
      params.modalidade,
      params.ano,
      params.mes,
      params.excludeId,
      params.planoAtribuicaoId,
    ),
  };
}

/**
 * Disponibilidade dia a dia de um mês para o wizard assistido por plano: além dos
 * dias, devolve o limite mensal do plano e quanto já foi usado.
 */
export async function getDisponibilidadeMesAssistido(params: {
  modalidade: ModalidadeAgendamento;
  ano: number;
  mes: number; // 1-12
  planoAtribuicaoId: string;
  atendimentos: number | null;
  periodicidade?: string;
}) {
  const { modalidade, ano, mes, planoAtribuicaoId, atendimentos } = params;
  const inicioMes = dataBrasilia(ano, mes);
  const fimMes = fimDoMes(inicioMes);
  const total = totalAtendimentosPlano(atendimentos, params.periodicidade ?? "MENSAL");

  const [usadosNoMes, usadosTotal, dias] = await Promise.all([
    contarAgendamentosNoMes(planoAtribuicaoId, inicioMes, fimMes),
    contarAgendamentosDaAtribuicao(planoAtribuicaoId),
    calcularDiasDisponiveis(modalidade, ano, mes, undefined, planoAtribuicaoId),
  ]);

  const limiteMesAtingido = atendimentos != null && usadosNoMes >= atendimentos;
  const limiteTotalAtingido = total != null && usadosTotal >= total;

  return {
    dias,
    limiteMes: atendimentos,
    usadosNoMes,
    limiteTotal: total,
    usadosTotal,
    limiteMesAtingido,
    limiteTotalAtingido,
    // bloqueia a visão do mês atual quando o mês encheu OU o plano todo encheu
    limiteAtingido: limiteMesAtingido || limiteTotalAtingido,
  };
}

export type AgendamentoAssistidoState = { error?: string; success?: boolean };

/** Cria um agendamento a partir do wizard de plano, com todas as checagens de sala/conflito/limite. */
export async function criarAgendamentoAssistido(params: {
  pacienteId: string;
  planoAtribuicaoId: string;
  profissionalId: string;
  modalidade: ModalidadeAgendamento;
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
}): Promise<AgendamentoAssistidoState> {
  const { pacienteId, planoAtribuicaoId, profissionalId, modalidade, data, horario } = params;

  if (!profissionalId) return { error: "Selecione o profissional." };
  if (!data || !horario) return { error: "Selecione dia e horário." };

  const [paciente, atribuicao, horarioConfig, erroProfissional] = await Promise.all([
    prisma.paciente.findUnique({ where: { id: pacienteId }, select: { nome: true } }),
    prisma.planoAtribuicao.findUnique({ where: { id: planoAtribuicaoId } }),
    prisma.horarioAtendimento.findUnique({
      where: { modalidade_horario: { modalidade, horario } },
    }),
    validarProfissionalModalidade(profissionalId, modalidade),
  ]);

  if (!paciente) return { error: "Paciente não encontrado." };
  if (erroProfissional) return { error: erroProfissional };
  if (!atribuicao || atribuicao.pacienteId !== pacienteId || atribuicao.status !== "ATIVO") {
    return { error: "Plano não está ativo para este paciente." };
  }
  if (!horarioConfig || !horarioConfig.ativo) {
    return { error: "Horário indisponível para essa modalidade." };
  }

  const dataInicio = combinarDataHora(data, horario);
  const dataFim = new Date(dataInicio.getTime() + horarioConfig.duracaoMin * 60000);

  const erroFuncionamento = await validarFuncionamento(dataInicio);
  if (erroFuncionamento) return { error: erroFuncionamento };

  // Teto do plano inteiro (MENSAL Nx = N no total; TRIMESTRAL Nx = N×3). É o limite duro.
  const totalPlano = totalAtendimentosPlano(
    atribuicao.atendimentos,
    atribuicao.periodicidade,
  );
  const usadosTotal = await contarAgendamentosDaAtribuicao(planoAtribuicaoId);
  if (totalPlano != null && usadosTotal >= totalPlano) {
    return {
      error: `Este plano permite ${totalPlano} atendimento(s) no total e todos já foram agendados. Remarque um atendimento existente em vez de criar outro.`,
    };
  }

  const usadosNoMes = await contarAgendamentosNoMes(
    planoAtribuicaoId,
    inicioDoMes(dataInicio),
    fimDoMes(dataInicio),
  );
  if (atribuicao.atendimentos != null && usadosNoMes >= atribuicao.atendimentos) {
    return {
      error: `Este plano permite ${atribuicao.atendimentos} atendimento(s) por mês e ${formatarMes(dataInicio)} já está cheio. Agende em outro mês do período do plano.`,
    };
  }

  const conflito = await buscarConflito({ profissionalId, dataInicio, dataFim });
  if (conflito) return { error: mensagemConflito(conflito) };

  const sala = await resolverSalaPlano({
    planoAtribuicaoId,
    modalidade,
    dataInicio,
    dataFim,
    quantidadePacientes: 1,
  });
  if (!sala.ok) return { error: sala.error };

  await prisma.agendamento.create({
    data: {
      titulo: `${MODALIDADE_AGENDAMENTO_LABEL[modalidade]} — ${paciente.nome}`,
      profissionalId,
      dataInicio,
      dataFim,
      modalidade,
      status: "AGENDADO",
      planoAtribuicaoId,
      salaId: sala.salaId,
      pacientes: { connect: { id: pacienteId } },
    },
  });

  revalidar([pacienteId]);
  return { success: true };
}

/**
 * Consumo do plano por mês para a aba "Agendamentos" do paciente: cada atribuição
 * ativa, quantos atendimentos o plano permite no mês, quais já estão marcados
 * (numerados por ordem de data) e quantos ainda sobram.
 */
export async function getConsumoPlanoPaciente(
  pacienteId: string,
  ano: number,
  mes: number, // 1-12
) {
  const inicioMes = dataBrasilia(ano, mes);
  const fimMes = fimDoMes(inicioMes);

  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: { pacienteId, status: "ATIVO" },
    orderBy: { createdAt: "desc" },
    include: { plano: { select: { tipos: true } } },
  });

  const ids = atribuicoes.map((a) => a.id);
  const [agendamentos, creditos, totaisPorAtribuicao] = atribuicoes.length
    ? await Promise.all([
        prisma.agendamento.findMany({
          where: {
            planoAtribuicaoId: { in: ids },
            status: { not: "CANCELADO" },
            dataInicio: { gte: inicioMes, lte: fimMes },
          },
          orderBy: { dataInicio: "asc" },
          include: {
            profissional: { select: { name: true } },
            sala: { select: { nome: true } },
          },
        }),
        prisma.creditoRemarcacao.findMany({
          where: {
            planoAtribuicaoId: { in: ids },
            createdAt: { gte: inicioMes, lte: fimMes },
          },
          select: { planoAtribuicaoId: true },
        }),
        prisma.agendamento.groupBy({
          by: ["planoAtribuicaoId"],
          where: { planoAtribuicaoId: { in: ids }, status: { not: "CANCELADO" } },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];

  return atribuicoes.map((a) => {
    const desta = agendamentos.filter((ag) => ag.planoAtribuicaoId === a.id);
    const creditosUsados = creditos.filter(
      (c) => c.planoAtribuicaoId === a.id,
    ).length;
    const usadosTotal =
      totaisPorAtribuicao.find((t) => t.planoAtribuicaoId === a.id)?._count._all ?? 0;
    const total = totalAtendimentosPlano(a.atendimentos, a.periodicidade);
    return {
      atribuicaoId: a.id,
      planoNome: a.planoNome,
      tipos: a.plano?.tipos ?? [],
      atendimentos: a.atendimentos,
      periodicidade: a.periodicidade,
      total,
      usados: desta.length,
      usadosTotal,
      disponiveisTotal: total != null ? Math.max(total - usadosTotal, 0) : null,
      creditos: {
        max: a.creditosRemarcacao,
        usados: creditosUsados,
        disponiveis: creditosDisponiveis(a.creditosRemarcacao, creditosUsados),
      },
      disponiveis:
        a.atendimentos != null ? Math.max(a.atendimentos - desta.length, 0) : null,
      agendamentos: desta.map((ag) => ({
        id: ag.id,
        titulo: ag.titulo,
        dataInicio: ag.dataInicio,
        dataFim: ag.dataFim,
        modalidade: ag.modalidade,
        status: ag.status,
        profissionalId: ag.profissionalId,
        profissional: ag.profissional?.name ?? null,
        sala: ag.sala?.nome ?? null,
        planoAtribuicaoId: ag.planoAtribuicaoId,
      })),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Agendamento manual de Serviço customizado (Psicologia, Nutrição, ...)
 * Ver model `Servico`. Pontual, sem grade recorrente/orçamento de plano.
 * ------------------------------------------------------------------ */

export type AgendamentoServicoState = { error?: string; success?: boolean };

/** Cria um agendamento avulso de Serviço customizado, com checagens de funcionamento/conflito/sala. */
export async function criarAgendamentoServico(params: {
  pacienteId: string;
  servicoId: string;
  profissionalId: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  valor: number;
  formaPagamento: "A_VISTA" | "ATE_3X_CARTAO";
  vencimentos: string[];
}): Promise<AgendamentoServicoState> {
  const { pacienteId, servicoId, profissionalId, data, horaInicio, horaFim } = params;

  if (!servicoId) return { error: "Selecione o serviço." };
  if (!profissionalId) return { error: "Selecione o profissional." };
  if (!data || !horaInicio || !horaFim) return { error: "Preencha data e horário." };

  const pagamento = agendamentoServicoPagamentoSchema.safeParse({
    valor: params.valor,
    formaPagamento: params.formaPagamento,
    vencimentos: params.vencimentos,
  });
  if (!pagamento.success) {
    return { error: pagamento.error.issues[0]?.message ?? "Dados de pagamento inválidos." };
  }

  const dataInicio = combinarDataHora(data, horaInicio);
  const dataFim = combinarDataHora(data, horaFim);
  if (dataFim <= dataInicio) {
    return { error: "Horário de término deve ser depois do início." };
  }

  const [paciente, servico, erroProfissional] = await Promise.all([
    prisma.paciente.findUnique({ where: { id: pacienteId }, select: { nome: true } }),
    prisma.servico.findUnique({
      where: { id: servicoId },
      select: { nome: true, ativo: true, taxaProfissionalPercentual: true },
    }),
    validarProfissionalServico(profissionalId, servicoId),
  ]);

  if (!paciente) return { error: "Paciente não encontrado." };
  if (!servico || !servico.ativo) return { error: "Serviço não encontrado ou inativo." };
  if (erroProfissional) return { error: erroProfissional };

  const erroFuncionamento = await validarFuncionamento(dataInicio);
  if (erroFuncionamento) return { error: erroFuncionamento };

  const conflito = await buscarConflito({ profissionalId, dataInicio, dataFim });
  if (conflito) return { error: mensagemConflito(conflito) };

  const sala = await resolverSalaServico({ servicoId, dataInicio, dataFim });
  if (!sala.ok) return { error: sala.error };

  const { valor, vencimentos } = pagamento.data;
  const parcelas = gerarValoresParcelas(valor, vencimentos.length);
  const percentualTaxa = Number(servico.taxaProfissionalPercentual);

  await prisma.$transaction([
    prisma.agendamento.create({
      data: {
        titulo: `${servico.nome} — ${paciente.nome}`,
        profissionalId,
        dataInicio,
        dataFim,
        modalidade: "OUTRO",
        servicoId,
        status: "AGENDADO",
        salaId: sala.salaId,
        pacientes: { connect: { id: pacienteId } },
      },
    }),
    prisma.cobranca.createMany({
      data: vencimentos.map((vencimento, i) => ({
        pacienteId,
        planoNome: servico.nome,
        valorBase: valor,
        valor: parcelas[i],
        vencimento: new Date(`${vencimento}T12:00:00`),
        status: "PENDENTE" as const,
        numeroParcela: i + 1,
        totalParcelas: vencimentos.length,
        notaFiscal: true,
        servicoId,
        taxaProfissional: calcularTaxaProfissional(parcelas[i], percentualTaxa),
      })),
    }),
  ]);

  revalidar([pacienteId]);
  return { success: true };
}

/** Agendamentos avulsos de Serviço customizado do paciente, num mês-calendário (Brasília). */
export async function listAgendamentosServicoPaciente(
  pacienteId: string,
  ano: number,
  mes: number, // 1-12
) {
  const inicioMes = dataBrasilia(ano, mes);
  const fimMes = fimDoMes(inicioMes);

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      pacientes: { some: { id: pacienteId } },
      modalidade: "OUTRO",
      dataInicio: { gte: inicioMes, lte: fimMes },
    },
    orderBy: { dataInicio: "asc" },
    include: {
      servico: { select: { nome: true } },
      profissional: { select: { name: true } },
      sala: { select: { nome: true } },
    },
  });

  return agendamentos.map((ag) => ({
    id: ag.id,
    titulo: ag.titulo,
    dataInicio: ag.dataInicio,
    dataFim: ag.dataFim,
    status: ag.status,
    servicoNome: ag.servico?.nome ?? "Serviço",
    profissional: ag.profissional?.name ?? null,
    sala: ag.sala?.nome ?? null,
  }));
}
