"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations/cliente";

const PAGE_SIZE = 10;

export async function listClientes(filters: { q?: string }, page: number) {
  const where = filters.q
    ? {
        OR: [
          { nome: { contains: filters.q, mode: "insensitive" as const } },
          { cpf: { contains: filters.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { execucoes: true } } },
    }),
    prisma.cliente.count({ where }),
  ]);

  return {
    clientes,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export type ClienteActionState = {
  error?: string;
  success?: boolean;
};

function parseClienteForm(formData: FormData) {
  const idadeRaw = formData.get("idade");

  return clienteSchema.safeParse({
    nome: formData.get("nome"),
    idade: idadeRaw ? String(idadeRaw) : undefined,
    cpf: formData.get("cpf") || undefined,
    contato: formData.get("contato") || undefined,
    historicoClinico: formData.get("historicoClinico") || undefined,
    objetivo: formData.get("objetivo") || undefined,
    doencasPreexistentes: formData.get("doencasPreexistentes") || undefined,
    cirurgiasAnteriores: formData.get("cirurgiasAnteriores") || undefined,
    medicamentos: formData.get("medicamentos") || undefined,
  });
}

export async function createCliente(
  _prevState: ClienteActionState,
  formData: FormData,
): Promise<ClienteActionState> {
  const parsed = parseClienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.cliente.create({
    data: {
      ...parsed.data,
      idade: parsed.data.idade ?? null,
      cpf: parsed.data.cpf || null,
    },
  });

  revalidatePath("/clientes");
  return { success: true };
}

export async function updateCliente(
  id: string,
  _prevState: ClienteActionState,
  formData: FormData,
): Promise<ClienteActionState> {
  const parsed = parseClienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      ...parsed.data,
      idade: parsed.data.idade ?? null,
      cpf: parsed.data.cpf || null,
    },
  });

  revalidatePath("/clientes");
  return { success: true };
}

export async function deleteCliente(id: string) {
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
