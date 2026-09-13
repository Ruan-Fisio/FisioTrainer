"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { salaSchema } from "@/lib/validations/sala";

export type SalaActionState = { error?: string; success?: boolean };

function revalidar() {
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function listSalas() {
  return prisma.sala.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] });
}

function parse(formData: FormData) {
  return salaSchema.safeParse({
    nome: formData.get("nome"),
    capacidadeEducacaoFisica: formData.get("capacidadeEducacaoFisica"),
    capacidadeFisioterapia: formData.get("capacidadeFisioterapia"),
  });
}

export async function createSala(
  _prev: SalaActionState,
  formData: FormData,
): Promise<SalaActionState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existente = await prisma.sala.findUnique({ where: { nome: parsed.data.nome } });
  if (existente) return { error: "Já existe uma sala com esse nome." };

  const ultima = await prisma.sala.findFirst({ orderBy: { ordem: "desc" } });
  await prisma.sala.create({
    data: { ...parsed.data, ordem: (ultima?.ordem ?? -1) + 1 },
  });

  revalidar();
  return { success: true };
}

export async function updateSala(
  id: string,
  _prev: SalaActionState,
  formData: FormData,
): Promise<SalaActionState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const conflito = await prisma.sala.findFirst({
    where: { nome: parsed.data.nome, id: { not: id } },
  });
  if (conflito) return { error: "Já existe uma sala com esse nome." };

  await prisma.sala.update({ where: { id }, data: parsed.data });
  revalidar();
  return { success: true };
}

export async function deleteSala(id: string) {
  const emUso = await prisma.planoSala.findFirst({
    where: { salaId: id },
    select: { plano: { select: { nome: true } } },
  });
  if (emUso) {
    throw new Error(
      `Esta sala está cadastrada no plano "${emUso.plano.nome}" e não pode ser excluída. Remova-a do plano primeiro.`,
    );
  }

  await prisma.sala.delete({ where: { id } });
  revalidar();
}
