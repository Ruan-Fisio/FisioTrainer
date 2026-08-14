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
