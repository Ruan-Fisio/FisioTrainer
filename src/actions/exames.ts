"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exameSchema } from "@/lib/validations/exame";

const PAGE_SIZE = 10;

export async function listExames(filters: { q?: string }, page: number) {
  const where = {
    ...(filters.q
      ? { nome: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };

  const [exames, total] = await Promise.all([
    prisma.exame.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { secoes: true } },
      },
    }),
    prisma.exame.count({ where }),
  ]);

  return {
    exames,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function getExame(id: string) {
  return prisma.exame.findUnique({
    where: { id },
    include: {
      secoes: {
        orderBy: { ordem: "asc" },
        include: {
          campos: {
            orderBy: { ordem: "asc" },
            include: {
              colunas: { orderBy: { ordem: "asc" } },
            },
          },
        },
      },
    },
  });
}

export type ExameActionState = {
  error?: string;
  success?: boolean;
};

function parseExameForm(formData: FormData) {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");
  const secoesRaw = formData.get("secoes");

  let secoes: unknown = [];

  try {
    secoes = secoesRaw ? JSON.parse(String(secoesRaw)) : [];
  } catch {
    return null;
  }

  return exameSchema.safeParse({ nome, descricao, secoes });
}

function secoesCreateData(secoes: ReturnType<typeof exameSchema.parse>["secoes"]) {
  return secoes.map((secao, secaoIndex) => ({
    nome: secao.nome,
    ordem: secaoIndex,
    campos: {
      create: secao.campos.map((campo, campoIndex) => ({
        nome: campo.nome,
        ordem: campoIndex,
        repetivel: campo.repetivel,
        colunas: {
          create: campo.colunas.map((coluna, colunaIndex) => ({
            titulo: coluna.titulo,
            tipo: coluna.tipo,
            formatacao: coluna.formatacao || null,
            opcoes: coluna.tipo === "MULTIPLA_ESCOLHA" ? coluna.opcoes : [],
            multiplaSelecao:
              coluna.tipo === "MULTIPLA_ESCOLHA"
                ? coluna.multiplaSelecao
                : false,
            valorIdeal:
              coluna.tipo === "NUMERO" && coluna.valorIdeal
                ? coluna.valorIdeal
                : null,
            direcaoIdeal:
              coluna.tipo === "NUMERO" ? coluna.direcaoIdeal || null : null,
            ordem: colunaIndex,
          })),
        },
      })),
    },
  }));
}

export async function createExame(
  _prevState: ExameActionState,
  formData: FormData,
): Promise<ExameActionState> {
  const parsed = parseExameForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.exame.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      secoes: { create: secoesCreateData(parsed.data.secoes) },
    },
  });

  revalidatePath("/exames");
  return { success: true };
}

export async function updateExame(
  id: string,
  _prevState: ExameActionState,
  formData: FormData,
): Promise<ExameActionState> {
  const parsed = parseExameForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.$transaction([
    prisma.exameSecao.deleteMany({ where: { exameId: id } }),
    prisma.exame.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        secoes: { create: secoesCreateData(parsed.data.secoes) },
      },
    }),
  ]);

  revalidatePath("/exames");
  return { success: true };
}

export async function deleteExame(id: string) {
  await prisma.exame.delete({ where: { id } });
  revalidatePath("/exames");
}
