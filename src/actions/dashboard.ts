"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [pacientes, avaliacoes, evolucoes] = await Promise.all([
    prisma.paciente.count(),
    prisma.exameExecucao.count({ where: { tipo: "AVALIACAO" } }),
    prisma.evolucao.count(),
  ]);

  return { pacientes, avaliacoes, evolucoes };
}

/** Agendamentos futuros (retornos/reavaliações) ainda não realizados. */
export async function getProximosAgendamentos(limite = 8) {
  const agora = new Date();

  return prisma.agendamento.findMany({
    where: { dataHora: { gte: agora }, status: "AGENDADO" },
    orderBy: { dataHora: "asc" },
    take: limite,
    include: { paciente: { select: { id: true, nome: true } } },
  });
}

export async function getResumoFinanceiro() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const [recebidoMes, aReceberMes, atrasadas] = await Promise.all([
    prisma.mensalidade.aggregate({
      _sum: { valor: true },
      where: {
        status: "PAGO",
        pagoEm: { gte: inicioMes, lt: inicioProximoMes },
      },
    }),
    prisma.mensalidade.aggregate({
      _sum: { valor: true },
      where: {
        status: "PENDENTE",
        vencimento: { gte: hoje, lt: inicioProximoMes },
      },
    }),
    prisma.mensalidade.findMany({
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
