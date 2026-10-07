"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  preCadastroSchema,
  rejeitarPreCadastroSchema,
} from "@/lib/validations/pre-cadastro";
import type { StatusPreCadastro } from "@/generated/prisma/client";

const PAGE_SIZE = 10;

export type PreCadastroActionState = {
  error?: string;
  success?: boolean;
};

/** Ação pública (sem login): grava o envio do formulário em /pre-cadastro. */
export async function criarPreCadastro(
  _prevState: PreCadastroActionState,
  formData: FormData,
): Promise<PreCadastroActionState> {
  const parsed = preCadastroSchema.safeParse({
    nome: formData.get("nome"),
    sobrenome: formData.get("sobrenome"),
    celular: formData.get("celular"),
    queixaPrincipal: formData.get("queixaPrincipal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.preCadastro.create({ data: parsed.data });

  revalidatePath("/curadoria");
  return { success: true };
}

async function exigirSessao() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
}

export async function listPreCadastros(
  filters: { status: StatusPreCadastro; q?: string },
  page: number,
) {
  const where = {
    status: filters.status,
    ...(filters.q
      ? {
          OR: [
            { nome: { contains: filters.q, mode: "insensitive" as const } },
            { sobrenome: { contains: filters.q, mode: "insensitive" as const } },
            { celular: { contains: filters.q.replace(/\D/g, "") || "__", } },
          ],
        }
      : {}),
  };

  // Pendentes: ordem de chegada (mais antigo primeiro). Histórico: mais recente primeiro.
  const orderBy =
    filters.status === "PENDENTE"
      ? { createdAt: "asc" as const }
      : { analisadoEm: "desc" as const };

  const [itens, total] = await Promise.all([
    prisma.preCadastro.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.preCadastro.count({ where }),
  ]);

  return {
    itens,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function contarPreCadastrosPorStatus() {
  const grupos = await prisma.preCadastro.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const contagem: Record<StatusPreCadastro, number> = {
    PENDENTE: 0,
    APROVADO: 0,
    REJEITADO: 0,
  };
  for (const g of grupos) contagem[g.status] = g._count._all;
  return contagem;
}

export async function buscarPreCadastroPendente(id: string) {
  return prisma.preCadastro.findFirst({ where: { id, status: "PENDENTE" } });
}

export async function rejeitarPreCadastro(
  id: string,
  _prevState: PreCadastroActionState,
  formData: FormData,
): Promise<PreCadastroActionState> {
  await exigirSessao();

  const parsed = rejeitarPreCadastroSchema.safeParse({
    motivo: formData.get("motivo") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { count } = await prisma.preCadastro.updateMany({
    where: { id, status: "PENDENTE" },
    data: {
      status: "REJEITADO",
      motivoRejeicao: parsed.data.motivo || null,
      analisadoEm: new Date(),
    },
  });
  if (count === 0) return { error: "Este pré-cadastro já foi analisado." };

  revalidatePath("/curadoria");
  return { success: true };
}
