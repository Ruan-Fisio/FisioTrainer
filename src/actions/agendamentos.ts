"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { agendamentoSchema, combinarDataHora } from "@/lib/validations/agendamento";
import { gerarOcorrencias, type RegraRecorrencia } from "@/lib/recorrencia";
import { MODALIDADE_SALA, temHorarioFixo } from "@/lib/salas";
import { pacientePodeDesmarcar } from "@/lib/agendamento-cancelamento";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

const PAGE_SIZE = 10;

const includePadrao = {
  pacientes: { select: { id: true, nome: true } },
  profissional: { select: { id: true, name: true } },
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

export async function getAgendamentosByPaciente(pacienteId: string) {
  return prisma.agendamento.findMany({
    where: { pacientes: { some: { id: pacienteId } } },
    orderBy: { dataInicio: "desc" },
    include: includePadrao,
  });
}

export async function getAgendamento(id: string) {
  return prisma.agendamento.findUnique({ where: { id }, include: includePadrao });
}

/**
 * Dois eventos conflitam quando pertencem ao mesmo profissional (ou ambos não
 * têm profissional definido) e os intervalos [dataInicio, dataFim) se sobrepõem.
 * Eventos cancelados liberam o horário. Isso nunca pode ser contornado: toda
 * criação/edição/remarcação passa por aqui antes de gravar no banco.
 */
async function buscarConflito(params: {
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

function mensagemConflito(conflito: { titulo: string; dataInicio: Date }) {
  const horario = conflito.dataInicio.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Conflito de horário com "${conflito.titulo}" (${horario}).`;
}

/**
 * Capacidade é contada por paciente, por modalidade, dentro da sala daquela modalidade
 * (Sala 1 tem limite independente para Educação Física e para Fisioterapia). Eventos que
 * se sobrepõem no tempo e são da mesma modalidade disputam a mesma capacidade.
 */
async function verificarCapacidade(params: {
  modalidade: ModalidadeAgendamento;
  dataInicio: Date;
  dataFim: Date;
  quantidadePacientes: number;
  excludeId?: string;
}) {
  const capacidade = MODALIDADE_SALA[params.modalidade].capacidade;

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

  const ocupadas = concorrentes.reduce((soma, a) => soma + Math.max(a.pacientes.length, 1), 0);
  const novas = Math.max(params.quantidadePacientes, 1);

  if (ocupadas + novas > capacidade) {
    const sala = MODALIDADE_SALA[params.modalidade].sala;
    const modalidadeLabel = MODALIDADE_AGENDAMENTO_LABEL[params.modalidade];
    return `${sala} lotada nesse horário para ${modalidadeLabel} (${ocupadas}/${capacidade} vagas ocupadas).`;
  }
  return null;
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
 */
export async function getDisponibilidadeHorarios(
  data: string,
  modalidade: ModalidadeAgendamento,
  excludeId?: string,
) {
  const horarios = await prisma.horarioAtendimento.findMany({
    where: { modalidade, ativo: true },
    orderBy: { ordem: "asc" },
  });
  if (horarios.length === 0) return [];

  const capacidade = MODALIDADE_SALA[modalidade].capacidade;
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

export type AgendamentoActionState = {
  error?: string;
  success?: boolean;
};

function parseForm(formData: FormData) {
  const pacienteIdsRaw = formData.get("pacienteIds");
  const diasSemanaRaw = formData.get("diasSemana");

  let pacienteIds: unknown = [];
  let diasSemana: unknown = [];

  try {
    pacienteIds = pacienteIdsRaw ? JSON.parse(String(pacienteIdsRaw)) : [];
    diasSemana = diasSemanaRaw ? JSON.parse(String(diasSemanaRaw)) : [];
  } catch {
    return null;
  }

  return agendamentoSchema.safeParse({
    titulo: formData.get("titulo"),
    pacienteIds,
    profissionalId: formData.get("profissionalId") || undefined,
    data: formData.get("data"),
    horaInicio: formData.get("horaInicio"),
    horaFim: formData.get("horaFim"),
    diaInteiro: formData.get("diaInteiro") === "on",
    modalidade: formData.get("modalidade"),
    status: formData.get("status"),
    observacao: formData.get("observacao") ?? "",
    repeticao: formData.get("repeticao") || "NAO_REPETE",
    intervalo: formData.get("intervalo") || undefined,
    unidade: formData.get("unidade") || undefined,
    diasSemana,
    termino: formData.get("termino") || undefined,
    terminoData: formData.get("terminoData") || undefined,
    terminoOcorrencias: formData.get("terminoOcorrencias") || undefined,
  });
}

function revalidar(pacienteIds: string[]) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  for (const pacienteId of pacienteIds) {
    revalidatePath(`/pacientes/${pacienteId}`);
  }
}

export async function createAgendamento(
  _prevState: AgendamentoActionState,
  formData: FormData,
): Promise<AgendamentoActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data;
  const diaInteiro = dados.diaInteiro;
  const horaInicio = diaInteiro ? "00:00" : dados.horaInicio;
  const horaFim = diaInteiro ? "23:59" : dados.horaFim;
  const dataInicioBase = combinarDataHora(dados.data, horaInicio);
  const dataFimBase = combinarDataHora(dados.data, horaFim);
  const duracaoMs = dataFimBase.getTime() - dataInicioBase.getTime();

  const profissionalId = dados.profissionalId || null;

  const dadosComuns = {
    titulo: dados.titulo,
    profissionalId,
    diaInteiro,
    modalidade: dados.modalidade,
    status: dados.status,
    observacao: dados.observacao,
    pacientes: { connect: dados.pacienteIds.map((id) => ({ id })) },
  };

  if (dados.repeticao === "NAO_REPETE") {
    const conflito = await buscarConflito({
      profissionalId,
      dataInicio: dataInicioBase,
      dataFim: dataFimBase,
    });
    if (conflito) return { error: mensagemConflito(conflito) };

    const semCapacidade = await verificarCapacidade({
      modalidade: dados.modalidade,
      dataInicio: dataInicioBase,
      dataFim: dataFimBase,
      quantidadePacientes: dados.pacienteIds.length,
    });
    if (semCapacidade) return { error: semCapacidade };

    await prisma.agendamento.create({
      data: {
        ...dadosComuns,
        dataInicio: dataInicioBase,
        dataFim: dataFimBase,
        serieId: null,
      },
    });
  } else {
    const unidadePorPreset = {
      DIARIA: "DIA",
      SEMANAL: "SEMANA",
      MENSAL: "MES",
      ANUAL: "ANO",
    } as const;

    const regra: RegraRecorrencia =
      dados.repeticao === "PERSONALIZADA"
        ? {
            intervalo: dados.intervalo ?? 1,
            unidade: dados.unidade ?? "SEMANA",
            diasSemana: dados.diasSemana,
            termino: dados.termino ?? "NUNCA",
            terminoData: dados.terminoData ? new Date(`${dados.terminoData}T23:59:59`) : undefined,
            terminoOcorrencias: dados.terminoOcorrencias,
          }
        : {
            intervalo: 1,
            unidade: unidadePorPreset[dados.repeticao],
            termino: dados.termino ?? "NUNCA",
            terminoData: dados.terminoData ? new Date(`${dados.terminoData}T23:59:59`) : undefined,
            terminoOcorrencias: dados.terminoOcorrencias,
          };

    const ocorrencias = gerarOcorrencias(dataInicioBase, regra);

    for (const dataInicio of ocorrencias) {
      const dataFim = new Date(dataInicio.getTime() + duracaoMs);
      const conflito = await buscarConflito({ profissionalId, dataInicio, dataFim });
      if (conflito) return { error: mensagemConflito(conflito) };

      const semCapacidade = await verificarCapacidade({
        modalidade: dados.modalidade,
        dataInicio,
        dataFim,
        quantidadePacientes: dados.pacienteIds.length,
      });
      if (semCapacidade) return { error: semCapacidade };
    }

    const serieId = randomUUID();

    await prisma.$transaction(
      ocorrencias.map((dataInicio) =>
        prisma.agendamento.create({
          data: {
            ...dadosComuns,
            dataInicio,
            dataFim: new Date(dataInicio.getTime() + duracaoMs),
            serieId,
          },
        }),
      ),
    );
  }

  revalidar(dados.pacienteIds);
  return { success: true };
}

export async function updateAgendamento(
  id: string,
  _prevState: AgendamentoActionState,
  formData: FormData,
): Promise<AgendamentoActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const dados = parsed.data;
  const diaInteiro = dados.diaInteiro;
  const horaInicio = diaInteiro ? "00:00" : dados.horaInicio;
  const horaFim = diaInteiro ? "23:59" : dados.horaFim;
  const profissionalId = dados.profissionalId || null;
  const dataInicio = combinarDataHora(dados.data, horaInicio);
  const dataFim = combinarDataHora(dados.data, horaFim);

  const conflito = await buscarConflito({ profissionalId, dataInicio, dataFim, excludeId: id });
  if (conflito) return { error: mensagemConflito(conflito) };

  const semCapacidade = await verificarCapacidade({
    modalidade: dados.modalidade,
    dataInicio,
    dataFim,
    quantidadePacientes: dados.pacienteIds.length,
    excludeId: id,
  });
  if (semCapacidade) return { error: semCapacidade };

  await prisma.agendamento.update({
    where: { id },
    data: {
      titulo: dados.titulo,
      profissionalId,
      diaInteiro,
      modalidade: dados.modalidade,
      status: dados.status,
      observacao: dados.observacao,
      dataInicio,
      dataFim,
      pacientes: { set: dados.pacienteIds.map((pacienteId) => ({ id: pacienteId })) },
    },
  });

  revalidar(dados.pacienteIds);
  return { success: true };
}

export async function deleteAgendamento(
  id: string,
  escopo: "esta" | "seguintes" | "todas" = "esta",
) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { pacientes: { select: { id: true } } },
  });
  if (!agendamento) return;

  const pacienteIds = agendamento.pacientes.map((p) => p.id);

  if (!agendamento.serieId || escopo === "esta") {
    await prisma.agendamento.delete({ where: { id } });
  } else if (escopo === "seguintes") {
    await prisma.agendamento.deleteMany({
      where: { serieId: agendamento.serieId, dataInicio: { gte: agendamento.dataInicio } },
    });
  } else {
    await prisma.agendamento.deleteMany({ where: { serieId: agendamento.serieId } });
  }

  revalidar(pacienteIds);
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

export type RemarcarActionState = { error?: string; success?: boolean };

/** Remarca um evento para nova data/horário, preservando duração, pacientes e demais dados. */
export async function remarcarAgendamento(
  id: string,
  novaData: string,
  novaHoraInicio: string,
  novaHoraFim: string,
): Promise<RemarcarActionState> {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { pacientes: { select: { id: true } } },
  });
  if (!agendamento) return { error: "Evento não encontrado." };

  const dataInicio = combinarDataHora(novaData, novaHoraInicio);
  const dataFim = combinarDataHora(novaData, novaHoraFim);

  if (dataFim <= dataInicio) {
    return { error: "Horário de término deve ser depois do início." };
  }

  const conflito = await buscarConflito({
    profissionalId: agendamento.profissionalId,
    dataInicio,
    dataFim,
    excludeId: id,
  });
  if (conflito) return { error: mensagemConflito(conflito) };

  const semCapacidade = await verificarCapacidade({
    modalidade: agendamento.modalidade,
    dataInicio,
    dataFim,
    quantidadePacientes: agendamento.pacientes.length,
    excludeId: id,
  });
  if (semCapacidade) return { error: semCapacidade };

  await prisma.agendamento.update({
    where: { id },
    data: { dataInicio, dataFim, status: "AGENDADO" },
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
): Promise<DesmarcarAgendamentoState> {
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { pacientes: { select: { id: true } } },
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

  const carimbo = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  await prisma.agendamento.update({
    where: { id: agendamentoId },
    data: {
      status: "CANCELADO",
      observacao: [ag.observacao, `Desmarcado pelo paciente pelo portal em ${carimbo}.`]
        .filter(Boolean)
        .join("\n"),
    },
  });

  revalidar(ag.pacientes.map((p) => p.id));
  return { success: true };
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
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const opcoes = atribuicoes.flatMap((a) => {
    const tipos = a.plano?.tipos ?? [];
    return tipos
      .filter((t) => MODALIDADE_POR_TIPO_PLANO[t])
      .map((t) => {
        const modalidade = MODALIDADE_POR_TIPO_PLANO[t];
        return {
          atribuicaoId: a.id,
          planoNome: a.planoNome,
          modalidade,
          atendimentos: a.atendimentos,
          sala: MODALIDADE_SALA[modalidade].sala,
        };
      });
  });

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
 */
async function calcularDiasDisponiveis(
  modalidade: ModalidadeAgendamento,
  ano: number,
  mes: number,
  excludeId?: string,
): Promise<DiaDisponibilidade[]> {
  const inicioMes = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
  const totalDias = fimMes.getDate();

  const dataStrDe = (dia: number) =>
    `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const horarios = temHorarioFixo(modalidade)
    ? await prisma.horarioAtendimento.findMany({
        where: { modalidade, ativo: true },
        orderBy: { ordem: "asc" },
      })
    : [];

  const capacidade = MODALIDADE_SALA[modalidade].capacidade;

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

    if (horarios.length === 0) {
      // horário livre: dia sempre disponível, o passo seguinte filtra
      return { data: dataStr, temHorarios: true, vagas: 1, lotado: false };
    }

    let vagasDia = 0;
    for (const h of horarios) {
      const inicioSlot = combinarDataHora(dataStr, h.horario);
      const fimSlot = new Date(inicioSlot.getTime() + h.duracaoMin * 60000);
      const ocupadas = agendamentosDoMes
        .filter((a) => a.dataInicio < fimSlot && a.dataFim > inicioSlot)
        .reduce((soma, a) => soma + Math.max(a.pacientes.length, 1), 0);
      vagasDia += Math.max(capacidade - ocupadas, 0);
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
}) {
  return { dias: await calcularDiasDisponiveis(params.modalidade, params.ano, params.mes, params.excludeId) };
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
}) {
  const { modalidade, ano, mes, planoAtribuicaoId, atendimentos } = params;
  const inicioMes = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

  const [usadosNoMes, dias] = await Promise.all([
    contarAgendamentosNoMes(planoAtribuicaoId, inicioMes, fimMes),
    calcularDiasDisponiveis(modalidade, ano, mes),
  ]);

  return {
    dias,
    limiteMes: atendimentos,
    usadosNoMes,
    limiteAtingido: atendimentos != null && usadosNoMes >= atendimentos,
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

  const [paciente, atribuicao, horarioConfig] = await Promise.all([
    prisma.paciente.findUnique({ where: { id: pacienteId }, select: { nome: true } }),
    prisma.planoAtribuicao.findUnique({ where: { id: planoAtribuicaoId } }),
    prisma.horarioAtendimento.findUnique({
      where: { modalidade_horario: { modalidade, horario } },
    }),
  ]);

  if (!paciente) return { error: "Paciente não encontrado." };
  if (!atribuicao || atribuicao.pacienteId !== pacienteId || atribuicao.status !== "ATIVO") {
    return { error: "Plano não está ativo para este paciente." };
  }
  if (!horarioConfig || !horarioConfig.ativo) {
    return { error: "Horário indisponível para essa modalidade." };
  }

  const dataInicio = combinarDataHora(data, horario);
  const dataFim = new Date(dataInicio.getTime() + horarioConfig.duracaoMin * 60000);

  const inicioMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1, 0, 0, 0, 0);
  const fimMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0, 23, 59, 59, 999);
  const usadosNoMes = await contarAgendamentosNoMes(planoAtribuicaoId, inicioMes, fimMes);
  if (atribuicao.atendimentos != null && usadosNoMes >= atribuicao.atendimentos) {
    return {
      error: `Limite de ${atribuicao.atendimentos} agendamento(s) deste plano já atingido neste mês.`,
    };
  }

  const conflito = await buscarConflito({ profissionalId, dataInicio, dataFim });
  if (conflito) return { error: mensagemConflito(conflito) };

  const semCapacidade = await verificarCapacidade({
    modalidade,
    dataInicio,
    dataFim,
    quantidadePacientes: 1,
  });
  if (semCapacidade) return { error: semCapacidade };

  await prisma.agendamento.create({
    data: {
      titulo: `${MODALIDADE_AGENDAMENTO_LABEL[modalidade]} — ${paciente.nome}`,
      profissionalId,
      dataInicio,
      dataFim,
      modalidade,
      status: "AGENDADO",
      planoAtribuicaoId,
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
  const inicioMes = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: { pacienteId, status: "ATIVO" },
    orderBy: { createdAt: "desc" },
    include: { plano: { select: { tipos: true } } },
  });

  const agendamentos = atribuicoes.length
    ? await prisma.agendamento.findMany({
        where: {
          planoAtribuicaoId: { in: atribuicoes.map((a) => a.id) },
          status: { not: "CANCELADO" },
          dataInicio: { gte: inicioMes, lte: fimMes },
        },
        orderBy: { dataInicio: "asc" },
        include: { profissional: { select: { name: true } } },
      })
    : [];

  return atribuicoes.map((a) => {
    const desta = agendamentos.filter((ag) => ag.planoAtribuicaoId === a.id);
    return {
      atribuicaoId: a.id,
      planoNome: a.planoNome,
      tipos: a.plano?.tipos ?? [],
      atendimentos: a.atendimentos,
      usados: desta.length,
      disponiveis:
        a.atendimentos != null ? Math.max(a.atendimentos - desta.length, 0) : null,
      agendamentos: desta.map((ag) => ({
        id: ag.id,
        dataInicio: ag.dataInicio,
        dataFim: ag.dataFim,
        modalidade: ag.modalidade,
        status: ag.status,
        profissional: ag.profissional?.name ?? null,
      })),
    };
  });
}
