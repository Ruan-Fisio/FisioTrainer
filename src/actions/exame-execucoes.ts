"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exameExecucaoSchema } from "@/lib/validations/exame-execucao";

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

export async function listAvaliacoesByCliente(clienteId: string) {
  return prisma.exameExecucao.findMany({
    where: { clienteId, tipo: "AVALIACAO" },
    orderBy: { data: "desc" },
    include: {
      exame: { select: { id: true, nome: true } },
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
      cliente: { select: { id: true, nome: true } },
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
  clienteId: string,
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
      clienteId,
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

  revalidatePath(`/clientes/${clienteId}`);
  return { success: true, execucaoId: execucao.id };
}

export async function createRetorno(
  clienteId: string,
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
    select: { exameId: true, clienteId: true },
  });

  if (!avaliacao || avaliacao.clienteId !== clienteId) {
    return { error: "Avaliação não encontrada." };
  }

  const execucao = await prisma.exameExecucao.create({
    data: {
      tipo: "RETORNO",
      clienteId,
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

  revalidatePath(`/clientes/${clienteId}`);
  return { success: true, execucaoId: execucao.id };
}

export async function updateExecucao(
  execucaoId: string,
  clienteId: string,
  _prevState: ExameExecucaoActionState,
  formData: FormData,
): Promise<ExameExecucaoActionState> {
  const parsed = parseExecucaoForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const execucao = await prisma.exameExecucao.findUnique({
    where: { id: execucaoId },
    select: { clienteId: true },
  });

  if (!execucao || execucao.clienteId !== clienteId) {
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

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/exames/${execucaoId}`);
  return { success: true, execucaoId };
}

export async function deleteExecucao(id: string, clienteId: string) {
  await prisma.exameExecucao.delete({ where: { id } });
  revalidatePath(`/clientes/${clienteId}`);
}
