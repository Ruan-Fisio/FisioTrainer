"use server";

import { endOfDay, endOfMonth, endOfWeek, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export type PeriodoProximos = "dia" | "semana" | "mes";

/** Contagem de compromissos ainda por acontecer em cada janela, para o resumo do dashboard. */
export async function getContagensAgenda() {
  const agora = new Date();
  const base = {
    status: "AGENDADO" as const,
    dataInicio: { gte: startOfDay(agora) },
  };

  const [dia, semana, mes] = await Promise.all([
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: startOfDay(agora), lte: endOfDay(agora) } },
    }),
    prisma.agendamento.count({
      where: {
        ...base,
        dataInicio: { gte: startOfDay(agora), lte: endOfWeek(agora, { weekStartsOn: 0 }) },
      },
    }),
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: startOfDay(agora), lte: endOfMonth(agora) } },
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
  const agora = new Date();
  const inicio = startOfDay(agora);
  const fim =
    periodo === "dia"
      ? endOfDay(agora)
      : periodo === "semana"
        ? endOfWeek(agora, { weekStartsOn: 0 })
        : endOfMonth(agora);

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
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

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
