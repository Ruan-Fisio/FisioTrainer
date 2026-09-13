"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { combinarDataHora } from "@/lib/validations/agendamento";
import { getConfigFuncionamento, validarFuncionamento } from "@/lib/funcionamento-config";
import { diaSemanaDeYmd } from "@/lib/funcionamento";
import { temHorarioFixo } from "@/lib/salas";
import { inicioDoMes, fimDoMes } from "@/lib/datas-brasilia";
import { toDateInputValue } from "@/lib/format";
import {
  buscarConflito,
  validarProfissionalModalidade,
  resolverSalaPlano,
} from "@/lib/agendamento-checagens";
import {
  bufferMesesGrade,
  datasDoDiaSemana,
  janelaCoberturaGrade,
  MESES_COBERTURA_GRADE,
  orcamentoGrade,
  preverGrade,
} from "@/lib/grade-recorrente";
import {
  gradeRecorrenteSchema,
  type GradeRecorrenteLinha,
} from "@/lib/validations/grade-recorrente";
import { MODALIDADE_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

const DURACAO_HORARIO_LIVRE_MIN = 50;

/** Modalidades que um plano pode cobrir (via `Plano.tipos`). */
const MODALIDADE_POR_TIPO_PLANO: Record<string, ModalidadeAgendamento> = {
  EDUCACAO_FISICA: "EDUCACAO_FISICA",
  FISIOTERAPIA: "FISIOTERAPIA",
};

/** Modalidades de agendamento cobertas por uma lista de `Plano.tipos`. */
function modalidadesDoPlano(tipos: string[]): ModalidadeAgendamento[] {
  return tipos
    .map((t) => MODALIDADE_POR_TIPO_PLANO[t])
    .filter(Boolean) as ModalidadeAgendamento[];
}

/* ------------------------------------------------------------------ *
 * Leitura — opções para o editor de grade no form de atribuição de plano
 * ------------------------------------------------------------------ */

/** Horários pré-configurados por modalidade + profissionais, para montar o editor de grade. */
export async function getGradeRecorrenteOpcoes() {
  const [horarios, profissionais] = await Promise.all([
    prisma.horarioAtendimento.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { modalidade: true, horario: true, duracaoMin: true },
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

  const horariosPorModalidade: Record<string, { horario: string; duracaoMin: number }[]> = {};
  for (const h of horarios) {
    (horariosPorModalidade[h.modalidade] ??= []).push({
      horario: h.horario,
      duracaoMin: h.duracaoMin,
    });
  }

  return { horariosPorModalidade, profissionais };
}

/** Linhas da grade recorrente ativa de uma atribuição (para preencher o form na edição). */
export async function getLinhasGradeRecorrente(atribuicaoId: string) {
  const linhas = await prisma.gradeRecorrenteAtendimento.findMany({
    where: { planoAtribuicaoId: atribuicaoId, ativo: true },
    orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
    select: {
      modalidade: true,
      diaSemana: true,
      horario: true,
      profissionalId: true,
    },
  });
  return linhas.map((l) => ({ ...l, profissionalId: l.profissionalId ?? undefined }));
}

/**
 * Opções do editor de grade + linhas atuais de cada atribuição ativa do paciente —
 * para o diálogo "Editar grade" (ícone) da aba Agendamentos.
 */
export async function getGradeRecorrenteContexto(pacienteId: string) {
  const [opcoes, atribuicoes] = await Promise.all([
    getGradeRecorrenteOpcoes(),
    prisma.planoAtribuicao.findMany({
      where: { pacienteId, status: "ATIVO" },
      select: {
        id: true,
        gradeRecorrente: {
          where: { ativo: true },
          orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
          select: {
            modalidade: true,
            diaSemana: true,
            horario: true,
            profissionalId: true,
          },
        },
      },
    }),
  ]);

  const linhasPorAtribuicao: Record<string, GradeRecorrenteLinha[]> = {};
  for (const a of atribuicoes) {
    linhasPorAtribuicao[a.id] = a.gradeRecorrente.map((l) => ({
      ...l,
      profissionalId: l.profissionalId ?? undefined,
    }));
  }
  return { opcoes, linhasPorAtribuicao };
}

export type SalvarGradeState = {
  error?: string;
  success?: boolean;
  resumo?: MaterializacaoResumo;
};

/**
 * Salva a grade de uma atribuição a partir do diálogo "Editar grade" (aba Agendamentos).
 * Valida, aplica (diff + materializa) e revalida as rotas afetadas.
 */
export async function salvarGradeRecorrente(
  atribuicaoId: string,
  linhasRaw: GradeRecorrenteLinha[],
): Promise<SalvarGradeState> {
  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id: atribuicaoId },
    select: {
      pacienteId: true,
      status: true,
      atendimentos: true,
      plano: { select: { tipos: true } },
    },
  });
  if (!atribuicao || atribuicao.status !== "ATIVO") {
    return { error: "Plano não está ativo para este paciente." };
  }

  const erro = await validarLinhasGrade(
    linhasRaw,
    atribuicao.plano?.tipos ?? [],
    atribuicao.atendimentos,
  );
  if (erro) return { error: erro };

  const resumo = await aplicarGradeRecorrente(atribuicaoId, linhasRaw);

  revalidatePath(`/pacientes/${atribuicao.pacienteId}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true, resumo };
}

export type PreviewGradeState = {
  error?: string;
  totalPlano: number | null;
  usadosAtuais: number;
  previstos: number;
  totalFinal: number;
  completo: boolean;
  ultimaData: string | null;
};

/**
 * Prévia — sem gravar nada — de quanto uma grade proposta preencheria do total do plano.
 * Mostrada ao vivo no editor da grade (`GradeRecorrenteDialog`), antes de salvar, pra
 * responder "essa grade que eu montei fecha a conta do plano, ou vou deixar atendimento sem
 * preencher?" (motivação: plano trimestral com muitos atendimentos/mês exige uma grade densa
 * o bastante pra não deixar saldo sem uso). Só considera dia da semana × limite mensal ×
 * total — conflito de profissional e capacidade de sala só são conferidos de fato ao salvar
 * (`aplicarGradeRecorrente`), então o resultado real pode ser um pouco menor que a prévia
 * quando há concorrência por sala/profissional.
 */
export async function previewGradeRecorrente(
  atribuicaoId: string,
  linhasRaw: GradeRecorrenteLinha[],
): Promise<PreviewGradeState> {
  const vazio: PreviewGradeState = {
    totalPlano: null,
    usadosAtuais: 0,
    previstos: 0,
    totalFinal: 0,
    completo: true,
    ultimaData: null,
  };

  const parsed = gradeRecorrenteSchema.safeParse({ linhas: linhasRaw });
  if (!parsed.success || parsed.data.linhas.length === 0) return vazio;

  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id: atribuicaoId },
    select: { status: true, atendimentos: true, periodicidade: true, dataInicio: true },
  });
  if (!atribuicao || atribuicao.status !== "ATIVO") {
    return { ...vazio, error: "Plano não está ativo." };
  }

  const agora = new Date();
  const hojeYmd = toDateInputValue(agora);
  const meses = MESES_COBERTURA_GRADE[atribuicao.periodicidade] ?? 1;
  const orcamentoTotal = orcamentoGrade(atribuicao.atendimentos, meses);
  const { de: janelaDe, ate: fimYmd } = janelaCoberturaGrade(
    toDateInputValue(atribuicao.dataInicio),
    meses + bufferMesesGrade(orcamentoTotal),
  );
  const deYmd = hojeYmd > janelaDe ? hojeYmd : janelaDe;

  // Base: tudo que continua contando mesmo depois de salvar — ou seja, tudo MENOS os
  // AGENDADO futuros ligados à grade atual (esses são apagados e refeitos ao salvar, ver
  // `aplicarGradeRecorrente` — a prévia simula esse mesmo recomeço).
  const foraDaGradeAtual = {
    planoAtribuicaoId: atribuicaoId,
    status: { not: "CANCELADO" as const },
    NOT: {
      status: "AGENDADO" as const,
      gradeRecorrenteId: { not: null },
      dataInicio: { gt: agora },
    },
  };

  const [usadosTotalBase, agendamentosBase, { diasAbertos, feriados }] = await Promise.all([
    prisma.agendamento.count({ where: foraDaGradeAtual }),
    prisma.agendamento.findMany({
      where: {
        ...foraDaGradeAtual,
        dataInicio: {
          gte: new Date(`${janelaDe}T00:00:00.000-03:00`),
          lte: new Date(`${fimYmd}T23:59:59.999-03:00`),
        },
      },
      select: { dataInicio: true },
    }),
    getConfigFuncionamento(),
  ]);

  const usadosNoMesBase: Record<string, number> = {};
  for (const a of agendamentosBase) {
    const ym = toDateInputValue(a.dataInicio).slice(0, 7);
    usadosNoMesBase[ym] = (usadosNoMesBase[ym] ?? 0) + 1;
  }

  const previsao = preverGrade({
    linhas: parsed.data.linhas,
    deYmd,
    fimYmd,
    atendimentosMes: atribuicao.atendimentos,
    orcamentoTotal,
    usadosTotalBase,
    usadosNoMesBase,
    diaFechado: (ymd) => !diasAbertos.has(diaSemanaDeYmd(ymd)) || feriados.has(ymd),
  });

  return {
    totalPlano: orcamentoTotal,
    usadosAtuais: usadosTotalBase,
    previstos: previsao.gerados,
    totalFinal: usadosTotalBase + previsao.gerados,
    completo: previsao.completo,
    ultimaData: previsao.ultimaData,
  };
}

/* ------------------------------------------------------------------ *
 * Escrita — validar e aplicar a grade (chamada pelas actions de atribuição de plano)
 * ------------------------------------------------------------------ */

function chaveLinha(l: {
  modalidade: string;
  diaSemana: string;
  horario: string;
  profissionalId?: string | null;
}) {
  return `${l.modalidade}|${l.diaSemana}|${l.horario}|${l.profissionalId ?? ""}`;
}

/**
 * Valida um conjunto de linhas de grade contra os tipos do plano, a grade fixa de
 * horários e a habilitação do profissional. Retorna a mensagem de erro ou `null`.
 * Feita ANTES de gravar a atribuição, para o form falhar cedo.
 */
export async function validarLinhasGrade(
  linhasRaw: GradeRecorrenteLinha[],
  tiposPlano: string[],
  maxAtendimentos: number | null,
): Promise<string | null> {
  const parsed = gradeRecorrenteSchema.safeParse({ linhas: linhasRaw });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Grade de atendimento inválida.";
  }

  if (maxAtendimentos != null && parsed.data.linhas.length > maxAtendimentos) {
    return `A grade pode ter no máximo ${maxAtendimentos} dia(s) — o limite de atendimentos do plano no mês.`;
  }

  const modalidadesPermitidas = new Set(modalidadesDoPlano(tiposPlano));
  const horariosFixos = await prisma.horarioAtendimento.findMany({
    where: { ativo: true },
    select: { modalidade: true, horario: true },
  });
  const horarioValido = new Set(horariosFixos.map((h) => `${h.modalidade}|${h.horario}`));

  for (const l of parsed.data.linhas) {
    if (!modalidadesPermitidas.has(l.modalidade)) {
      return `O plano não cobre a modalidade ${MODALIDADE_AGENDAMENTO_LABEL[l.modalidade]}.`;
    }
    if (temHorarioFixo(l.modalidade) && !horarioValido.has(`${l.modalidade}|${l.horario}`)) {
      return `O horário ${l.horario} não está configurado para ${MODALIDADE_AGENDAMENTO_LABEL[l.modalidade]}.`;
    }
    const erroProf = await validarProfissionalModalidade(
      l.profissionalId ?? null,
      l.modalidade,
    );
    if (erroProf) return erroProf;
  }
  return null;
}

/**
 * Substitui a grade recorrente de uma atribuição pelo conjunto informado e
 * **reconcilia por completo** os agendamentos futuros: toda alteração de grade apaga
 * TODOS os agendamentos ligados à grade que ainda não aconteceram (`dataInicio > agora`,
 * `status: AGENDADO`) — inclusive os que já tinham sido remarcados — e os recria a partir
 * da grade nova, respeitando limite mensal / capacidade / conflito. Agendamentos já
 * realizados (COMPARECEU/FALTOU) ou cancelados nunca são tocados.
 * Não revalida rotas — quem chama (as actions de atribuição de plano) já revalida.
 */
export async function aplicarGradeRecorrente(
  atribuicaoId: string,
  linhasRaw: GradeRecorrenteLinha[],
): Promise<MaterializacaoResumo> {
  const parsed = gradeRecorrenteSchema.safeParse({ linhas: linhasRaw });
  const linhas = parsed.success ? parsed.data.linhas : [];
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    const existentes = await tx.gradeRecorrenteAtendimento.findMany({
      where: { planoAtribuicaoId: atribuicaoId, ativo: true },
    });
    const novasChaves = new Set(linhas.map(chaveLinha));
    const existentesChaves = new Set(existentes.map(chaveLinha));

    // Reconciliação total: apaga todos os agendamentos futuros ainda não realizados
    // ligados à grade desta atribuição — serão recriados conforme a grade nova.
    await tx.agendamento.deleteMany({
      where: {
        planoAtribuicaoId: atribuicaoId,
        gradeRecorrenteId: { not: null },
        status: "AGENDADO",
        dataInicio: { gt: agora },
      },
    });

    const removidas = existentes.filter((e) => !novasChaves.has(chaveLinha(e)));
    if (removidas.length > 0) {
      await tx.gradeRecorrenteAtendimento.deleteMany({
        where: { id: { in: removidas.map((r) => r.id) } },
      });
    }

    const adicionadas = linhas.filter((l) => !existentesChaves.has(chaveLinha(l)));
    if (adicionadas.length > 0) {
      await tx.gradeRecorrenteAtendimento.createMany({
        data: adicionadas.map((l) => ({
          planoAtribuicaoId: atribuicaoId,
          modalidade: l.modalidade,
          diaSemana: l.diaSemana,
          horario: l.horario,
          profissionalId: l.profissionalId ?? null,
        })),
      });
    }
  });

  return materializarGradeRecorrente(atribuicaoId);
}

/* ------------------------------------------------------------------ *
 * Gerador
 * ------------------------------------------------------------------ */

export type MaterializacaoResumo = {
  criados: number;
  pulados: { data: string; motivo: string }[];
};

/** Materializa os agendamentos da grade de UMA atribuição para o horizonte rolante. Idempotente. */
export async function materializarGradeRecorrente(
  atribuicaoId: string,
): Promise<MaterializacaoResumo> {
  const resumo: MaterializacaoResumo = { criados: 0, pulados: [] };

  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id: atribuicaoId },
    include: {
      paciente: { select: { id: true, nome: true } },
      gradeRecorrente: { where: { ativo: true } },
    },
  });
  if (!atribuicao || atribuicao.status !== "ATIVO") return resumo;
  const linhas = atribuicao.gradeRecorrente;
  if (linhas.length === 0) return resumo;

  const agora = new Date();
  const hojeYmd = toDateInputValue(agora);

  // Cobertura do plano: MENSAL = 1 mês, TRIMESTRAL = 3 meses. O total de atendimentos é
  // `atendimentos × meses` ("dividido entre os meses"); cada mês continua limitado a
  // `atendimentos`, mas o que não coube num mês (ex. plano começou no dia 09, sobrou só
  // 3 segundas) **transborda para os meses seguintes** até gastar o total — mesmo que a
  // grade seja "rala" (poucos dias/semana) e isso demore vários meses a mais que o período
  // nominal do plano. O corte real é sempre o total (`orcamentoTotal`), nunca a janela —
  // ver `bufferMesesGrade`.
  const meses = MESES_COBERTURA_GRADE[atribuicao.periodicidade] ?? 1;
  const orcamentoTotal = orcamentoGrade(atribuicao.atendimentos, meses);
  const { de: janelaDe, ate: fimYmd } = janelaCoberturaGrade(
    toDateInputValue(atribuicao.dataInicio),
    meses + bufferMesesGrade(orcamentoTotal),
  );
  const deYmd = hojeYmd > janelaDe ? hojeYmd : janelaDe;
  if (deYmd > fimYmd) return resumo; // período do plano já passou

  // Quantos atendimentos da atribuição já contam contra o total (janela inteira).
  let usadosTotal = await prisma.agendamento.count({
    where: {
      planoAtribuicaoId: atribuicaoId,
      status: { not: "CANCELADO" },
      dataInicio: {
        gte: new Date(`${janelaDe}T00:00:00.000-03:00`),
        lte: new Date(`${fimYmd}T23:59:59.999-03:00`),
      },
    },
  });

  const horariosFixos = await prisma.horarioAtendimento.findMany({
    where: { ativo: true },
    select: { modalidade: true, horario: true, duracaoMin: true },
  });
  const duracaoDe = (modalidade: ModalidadeAgendamento, horario: string) => {
    if (!temHorarioFixo(modalidade)) return DURACAO_HORARIO_LIVRE_MIN;
    return (
      horariosFixos.find((h) => h.modalidade === modalidade && h.horario === horario)
        ?.duracaoMin ?? null
    );
  };

  // Contagem de agendamentos não-cancelados da atribuição por mês-calendário (Brasília),
  // carregada sob demanda e incrementada conforme criamos.
  const usadosNoMes = new Map<string, number>();
  const contarMes = async (ym: string) => {
    if (usadosNoMes.has(ym)) return usadosNoMes.get(ym)!;
    const ref = new Date(`${ym}-15T12:00:00-03:00`);
    const total = await prisma.agendamento.count({
      where: {
        planoAtribuicaoId: atribuicaoId,
        status: { not: "CANCELADO" },
        dataInicio: { gte: inicioDoMes(ref), lte: fimDoMes(ref) },
      },
    });
    usadosNoMes.set(ym, total);
    return total;
  };

  // Expande as linhas em (data, linha) e ordena por data — assim o corte no limite
  // mensal pega os primeiros dias do mês na ordem do calendário (Seg, Qua, Qui…),
  // não todos os dias de uma linha antes da próxima.
  const slotsExpandidos = linhas
    .flatMap((linha) =>
      datasDoDiaSemana(linha.diaSemana, deYmd, fimYmd).map((ymd) => ({ ymd, linha })),
    )
    .sort((a, b) => a.ymd.localeCompare(b.ymd));

  for (const { ymd, linha } of slotsExpandidos) {
    // Total de atendimentos do plano atingido — nada mais entra (nem em meses seguintes).
    if (orcamentoTotal != null && usadosTotal >= orcamentoTotal) break;

    const dataInicio = combinarDataHora(ymd, linha.horario);
    if (dataInicio < agora) continue;

    const erroFuncionamento = await validarFuncionamento(dataInicio);
    if (erroFuncionamento) {
      resumo.pulados.push({ data: ymd, motivo: "clínica fechada nesse dia" });
      continue;
    }

    const slotData = new Date(`${ymd}T00:00:00.000Z`);
    const jaExiste = await prisma.agendamento.findFirst({
      where: { gradeRecorrenteId: linha.id, slotData },
      select: { id: true },
    });
    if (jaExiste) continue;

    const ym = ymd.slice(0, 7);
    const usados = await contarMes(ym);
    // Mês cheio: o atendimento transborda para um mês seguinte (não é "pulado").
    if (atribuicao.atendimentos != null && usados >= atribuicao.atendimentos) {
      continue;
    }

    const duracaoMin = duracaoDe(linha.modalidade, linha.horario);
    if (duracaoMin == null) {
      resumo.pulados.push({ data: ymd, motivo: "horário não configurado" });
      continue;
    }
    const dataFim = new Date(dataInicio.getTime() + duracaoMin * 60000);

    const conflito = await buscarConflito({
      profissionalId: linha.profissionalId ?? null,
      dataInicio,
      dataFim,
    });
    if (conflito) {
      resumo.pulados.push({ data: ymd, motivo: "conflito de profissional" });
      continue;
    }

    const sala = await resolverSalaPlano({
      planoAtribuicaoId: atribuicaoId,
      modalidade: linha.modalidade,
      dataInicio,
      dataFim,
      quantidadePacientes: 1,
    });
    if (!sala.ok) {
      resumo.pulados.push({
        data: ymd,
        motivo: sala.error.includes("sala configurada") ? "sem sala configurada" : "sala lotada",
      });
      continue;
    }

    await prisma.agendamento.create({
      data: {
        titulo: `${MODALIDADE_AGENDAMENTO_LABEL[linha.modalidade]} — ${atribuicao.paciente.nome}`,
        profissionalId: linha.profissionalId ?? null,
        dataInicio,
        dataFim,
        modalidade: linha.modalidade,
        status: "AGENDADO",
        planoAtribuicaoId: atribuicaoId,
        gradeRecorrenteId: linha.id,
        slotData,
        salaId: sala.salaId,
        pacientes: { connect: { id: atribuicao.paciente.id } },
      },
    });
    usadosNoMes.set(ym, usados + 1);
    usadosTotal += 1;
    resumo.criados += 1;
  }

  return resumo;
}

/** Completa a grade de todas as atribuições ativas de um paciente (lazy top-up). */
export async function materializarGradesPaciente(pacienteId: string) {
  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: {
      pacienteId,
      status: "ATIVO",
      gradeRecorrente: { some: { ativo: true } },
    },
    select: { id: true },
  });
  for (const a of atribuicoes) {
    await materializarGradeRecorrente(a.id);
  }
}

/** Completa a grade de todas as atribuições ativas da clínica (lazy top-up ao abrir a agenda). */
export async function materializarTodasGrades() {
  const atribuicoes = await prisma.planoAtribuicao.findMany({
    where: {
      status: "ATIVO",
      gradeRecorrente: { some: { ativo: true } },
    },
    select: { id: true },
  });
  for (const a of atribuicoes) {
    await materializarGradeRecorrente(a.id);
  }
}
