"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exameExecucaoSchema } from "@/lib/validations/exame-execucao";
import { montarComparativo } from "@/lib/relatorio-comparativo";

export async function listAllExamesCompletos() {
  return prisma.exame.findMany({
    orderBy: { nome: "asc" },
    include: {
      secoes: {
        orderBy: { ordem: "asc" },
        include: {
          campos: {
            orderBy: { ordem: "asc" },
            include: { colunas: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  });
}

export async function getAvaliacoesByPaciente(pacienteId: string) {
  return prisma.exameExecucao.findMany({
    where: { pacienteId, tipo: "AVALIACAO" },
    orderBy: { data: "desc" },
    include: {
      exame: { select: { id: true, nome: true, tipo: true } },
      retornos: {
        orderBy: { data: "desc" },
        select: { id: true, data: true },
      },
    },
  });
}

export async function getExecucao(id: string) {
  return prisma.exameExecucao.findUnique({
    where: { id },
    include: {
      paciente: { select: { id: true, nome: true } },
      exame: {
        include: {
          secoes: {
            orderBy: { ordem: "asc" },
            include: {
              campos: {
                orderBy: { ordem: "asc" },
                include: { colunas: { orderBy: { ordem: "asc" } } },
              },
            },
          },
        },
      },
      avaliacao: { select: { id: true, data: true } },
      retornos: {
        orderBy: { data: "desc" },
        select: { id: true, data: true },
      },
      valores: true,
    },
  });
}

export async function getComparativo(avaliacaoId: string, retornoId: string) {
  const [avaliacao, retorno, movimentos] = await Promise.all([
    prisma.exameExecucao.findUnique({
      where: { id: avaliacaoId },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            idade: true,
            cpf: true,
            contato: true,
            objetivo: true,
            doencasPreexistentes: true,
            cirurgiasAnteriores: true,
            medicamentos: true,
            historicoClinico: true,
          },
        },
        exame: {
          include: {
            secoes: {
              orderBy: { ordem: "asc" },
              include: {
                campos: {
                  orderBy: { ordem: "asc" },
                  include: { colunas: { orderBy: { ordem: "asc" } } },
                },
              },
            },
          },
        },
        valores: true,
      },
    }),
    prisma.exameExecucao.findUnique({
      where: { id: retornoId },
      select: { id: true, data: true, avaliacaoId: true, valores: true },
    }),
    prisma.movimento.findMany({ select: { nome: true, grauIdeal: true } }),
  ]);

  if (
    !avaliacao ||
    avaliacao.tipo !== "AVALIACAO" ||
    !retorno ||
    retorno.avaliacaoId !== avaliacaoId
  ) {
    return null;
  }

  const secoes = montarComparativo(
    avaliacao.exame,
    avaliacao.valores,
    retorno.valores,
    movimentos,
  );

  return {
    paciente: avaliacao.paciente,
    exame: { id: avaliacao.exame.id, nome: avaliacao.exame.nome },
    avaliacaoData: avaliacao.data,
    retornoData: retorno.data,
    secoes,
  };
}

export type ExameExecucaoActionState = {
  error?: string;
  success?: boolean;
  execucaoId?: string;
};

function parseExecucaoForm(formData: FormData) {
  const exameId = formData.get("exameId");
  const valoresRaw = formData.get("valores");

  let valores: unknown = [];

  try {
    valores = valoresRaw ? JSON.parse(String(valoresRaw)) : [];
  } catch {
    return null;
  }

  return exameExecucaoSchema.safeParse({ exameId, valores });
}

export async function createAvaliacao(
  pacienteId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const execucao = await prisma.exameExecucao.create({
    data: {
      tipo: "AVALIACAO",
      pacienteId,
      exameId: parsed.data.exameId,
      valores: {
        create: parsed.data.valores.map((v) => ({
          colunaId: v.colunaId,
          valor: v.valor,
          linha: v.linha,
        })),
      },
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, execucaoId: execucao.id };
}

export async function createRetorno(
  pacienteId: string,
  avaliacaoId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const avaliacao = await prisma.exameExecucao.findUnique({
    where: { id: avaliacaoId },
    select: { exameId: true, pacienteId: true },
  });

  if (!avaliacao || avaliacao.pacienteId !== pacienteId) {
    return { error: "Avaliação não encontrada." };
  }

  const execucao = await prisma.exameExecucao.create({
    data: {
      tipo: "RETORNO",
      pacienteId,
      exameId: avaliacao.exameId,
      avaliacaoId,
      valores: {
        create: parsed.data.valores.map((v) => ({
          colunaId: v.colunaId,
          valor: v.valor,
          linha: v.linha,
        })),
      },
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, execucaoId: execucao.id };
}

export async function updateExecucao(
  execucaoId: string,
  pacienteId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const execucao = await prisma.exameExecucao.findUnique({
    where: { id: execucaoId },
    select: { pacienteId: true },
  });

  if (!execucao || execucao.pacienteId !== pacienteId) {
    return { error: "Registro não encontrado." };
  }

  await prisma.$transaction([
    prisma.exameExecucaoValor.deleteMany({ where: { execucaoId } }),
    prisma.exameExecucao.update({
      where: { id: execucaoId },
      data: {
        valores: {
          create: parsed.data.valores.map((v) => ({
            colunaId: v.colunaId,
            valor: v.valor,
            linha: v.linha,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/exames/${execucaoId}`);
  return { success: true, execucaoId };
}

export async function deleteExecucao(id: string, pacienteId: string) {
  await prisma.exameExecucao.delete({ where: { id } });
  revalidatePath(`/pacientes/${pacienteId}`);
}
