"use server";

import { prisma } from "@/lib/prisma";
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  inicioDoDia,
  inicioDoMes,
  inicioDoProximoMes,
} from "@/lib/datas-brasilia";

export type PeriodoProximos = "dia" | "semana" | "mes";

/** Contagem de compromissos ainda por acontecer em cada janela, para o resumo do dashboard. */
export async function getContagensAgenda() {
  const inicio = inicioDoDia();
  const base = { status: "AGENDADO" as const };

  const [dia, semana, mes] = await Promise.all([
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDoDia() } },
    }),
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDaSemana() } },
    }),
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDoMes() } },
    }),
  ]);

  return { dia, semana, mes };
}

export async function getDashboardStats() {
  const [pacientes, avaliacoes, evolucoes] = await Promise.all([
    prisma.paciente.count(),
    prisma.exameExecucao.count({ where: { tipo: "AVALIACAO" } }),
    prisma.evolucao.count(),
  ]);

  return { pacientes, avaliacoes, evolucoes };
}

/** Agendamentos futuros (retornos/reavaliações) ainda não realizados, dentro do período escolhido. */
export async function getProximosAgendamentos(periodo: PeriodoProximos = "dia") {
  const inicio = inicioDoDia();
  const fim =
    periodo === "dia" ? fimDoDia() : periodo === "semana" ? fimDaSemana() : fimDoMes();

  return prisma.agendamento.findMany({
    where: { dataInicio: { gte: inicio, lte: fim }, status: { not: "CANCELADO" } },
    orderBy: { dataInicio: "asc" },
    take: 200,
    include: {
      pacientes: { select: { id: true, nome: true } },
      profissional: { select: { id: true, name: true } },
    },
  });
}

export async function getResumoFinanceiro() {
  const hoje = inicioDoDia();
  const inicioMes = inicioDoMes();
  const inicioProximoMes = inicioDoProximoMes();

  const [recebidoMes, aReceberMes, atrasadas] = await Promise.all([
    prisma.cobranca.aggregate({
      _sum: { valor: true },
      where: {
        status: "PAGO",
        pagoEm: { gte: inicioMes, lt: inicioProximoMes },
      },
    }),
    prisma.cobranca.aggregate({
      _sum: { valor: true },
      where: {
        status: "PENDENTE",
        vencimento: { gte: hoje, lt: inicioProximoMes },
      },
    }),
    prisma.cobranca.findMany({
      where: { status: "PENDENTE", vencimento: { lt: hoje } },
      orderBy: { vencimento: "asc" },
      include: { paciente: { select: { id: true, nome: true } } },
    }),
  ]);

  return {
    recebidoMes: Number(recebidoMes._sum.valor ?? 0),
    aReceberMes: Number(aReceberMes._sum.valor ?? 0),
    atrasadas: atrasadas.map((m) => ({ ...m, valor: Number(m.valor) })),
    totalAtrasado: atrasadas.reduce((soma, m) => soma + Number(m.valor), 0),
  };
}
