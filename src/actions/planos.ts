"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { planoSchema } from "@/lib/validations/plano";

const PAGE_SIZE = 10;

export async function listPlanos(
  filters: { q?: string; tipo?: "FISIOTERAPIA" | "EDUCACAO_FISICA" },
  page: number,
) {
  const where = {
    ...(filters.q
      ? { nome: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.tipo ? { tipos: { has: filters.tipo } } : {}),
  };

  const [planos, total] = await Promise.all([
    prisma.plano.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        opcoes: { orderBy: { ordem: "asc" } },
        _count: { select: { atribuicoes: true } },
      },
    }),
    prisma.plano.count({ where }),
  ]);

  return {
    planos: planos.map((p) => ({
      ...p,
      taxaCartao: Number(p.taxaCartao),
      opcoes: p.opcoes.map((o) => ({ ...o, valor: Number(o.valor) })),
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listPlanosDisponiveis() {
  const planos = await prisma.plano.findMany({
    orderBy: { nome: "asc" },
    include: { opcoes: { orderBy: { ordem: "asc" } } },
  });
  return planos.map((p) => ({
    ...p,
    taxaCartao: Number(p.taxaCartao),
    opcoes: p.opcoes.map((o) => ({ ...o, valor: Number(o.valor) })),
  }));
}

export async function getPlano(id: string) {
  const plano = await prisma.plano.findUnique({
    where: { id },
    include: { opcoes: { orderBy: { ordem: "asc" } } },
  });
  if (!plano) return null;
  return {
    ...plano,
    taxaCartao: Number(plano.taxaCartao),
    opcoes: plano.opcoes.map((o) => ({ ...o, valor: Number(o.valor) })),
  };
}

export type PlanoActionState = {
  error?: string;
  success?: boolean;
};

function parseForm(formData: FormData) {
  let opcoes: unknown = [];
  try {
    opcoes = JSON.parse(String(formData.get("opcoes") ?? "[]"));
  } catch {
    return null;
  }

  return planoSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") ?? "",
    tipos: formData.getAll("tipos"),
    opcoes,
    taxaCartao: formData.get("taxaCartao") ?? "0",
  });
}

export async function createPlano(
  _prevState: PlanoActionState,
  formData: FormData,
): Promise<PlanoActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.plano.findUnique({
    where: { nome: parsed.data.nome },
  });

  if (existing) {
    return { error: "Já existe um plano com este nome." };
  }

  const { opcoes, ...dados } = parsed.data;

  await prisma.plano.create({
    data: {
      ...dados,
      opcoes: {
        create: opcoes.map((o, ordem) => ({ ...o, ordem })),
      },
    },
  });

  revalidatePath("/planos");
  return { success: true };
}

export async function updatePlano(
  id: string,
  _prevState: PlanoActionState,
  formData: FormData,
): Promise<PlanoActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.plano.findUnique({
    where: { nome: parsed.data.nome },
  });

  if (existing && existing.id !== id) {
    return { error: "Já existe um plano com este nome." };
  }

  const { opcoes, ...dados } = parsed.data;

  await prisma.$transaction([
    prisma.planoOpcao.deleteMany({ where: { planoId: id } }),
    prisma.plano.update({
      where: { id },
      data: {
        ...dados,
        opcoes: {
          create: opcoes.map((o, ordem) => ({ ...o, ordem })),
        },
      },
    }),
  ]);

  revalidatePath("/planos");
  return { success: true };
}

export async function deletePlano(id: string) {
  const plano = await prisma.plano.findUnique({
    where: { id },
    include: { _count: { select: { atribuicoes: true } } },
  });

  if (!plano) return;

  if (plano._count.atribuicoes > 0) {
    throw new Error("Plano em uso não pode ser excluído.");
  }

  await prisma.plano.delete({ where: { id } });
  revalidatePath("/planos");
}
