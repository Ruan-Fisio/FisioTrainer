"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { movimentoSchema } from "@/lib/validations/movimento";

const PAGE_SIZE = 10;
const ROUTE = "/biblioteca-movimento/goniometria";

export async function listMovimentos(filters: { q?: string }, page: number) {
  const where = filters.q
    ? { nome: { contains: filters.q, mode: "insensitive" as const } }
    : {};

  const [movimentos, total] = await Promise.all([
    prisma.movimento.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.movimento.count({ where }),
  ]);

  return {
    movimentos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listAllMovimentos() {
  return prisma.movimento.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, grauIdeal: true },
  });
}

export type MovimentoActionState = {
  error?: string;
  success?: boolean;
};

export async function createMovimento(
  _prevState: MovimentoActionState,
  formData: FormData,
): Promise<MovimentoActionState> {
  const parsed = movimentoSchema.safeParse({
    nome: formData.get("nome"),
    grauIdeal: formData.get("grauIdeal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.movimento.findUnique({
    where: { nome: parsed.data.nome },
  });

  if (existing) {
    return { error: "Já existe um movimento com este nome." };
  }

  await prisma.movimento.create({ data: parsed.data });

  revalidatePath(ROUTE);
  return { success: true };
}

export async function updateMovimento(
  id: string,
  _prevState: MovimentoActionState,
  formData: FormData,
): Promise<MovimentoActionState> {
  const parsed = movimentoSchema.safeParse({
    nome: formData.get("nome"),
    grauIdeal: formData.get("grauIdeal"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.movimento.findUnique({
    where: { nome: parsed.data.nome },
  });

  if (existing && existing.id !== id) {
    return { error: "Já existe um movimento com este nome." };
  }

  await prisma.movimento.update({ where: { id }, data: parsed.data });

  revalidatePath(ROUTE);
  return { success: true };
}

export async function deleteMovimento(id: string) {
  await prisma.movimento.delete({ where: { id } });
  revalidatePath(ROUTE);
}

export type ImportMovimentosState = {
  error?: string;
  success?: boolean;
  imported?: number;
};

function parseCsv(text: string): string[][] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/[,;]/).map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export async function importMovimentosCsv(
  _prevState: ImportMovimentosState,
  formData: FormData,
): Promise<ImportMovimentosState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo CSV." };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return { error: "Arquivo CSV vazio." };
  }

  const header = rows[0].map((cell) => cell.toLowerCase());
  const nomeIdx = header.findIndex((cell) => cell.includes("nome"));
  const grauIdx = header.findIndex((cell) => cell.includes("grau"));

  const hasHeader = nomeIdx !== -1 && grauIdx !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const colNome = hasHeader ? nomeIdx : 0;
  const colGrau = hasHeader ? grauIdx : 1;

  const registros = dataRows
    .map((row) => ({
      nome: row[colNome]?.trim() ?? "",
      grauIdeal: row[colGrau]?.trim() ?? "",
    }))
    .filter((r) => r.nome.length > 0 && r.grauIdeal.length > 0);

  if (registros.length === 0) {
    return { error: "Nenhum registro válido encontrado no CSV." };
  }

  await prisma.$transaction(
    registros.map((registro) =>
      prisma.movimento.upsert({
        where: { nome: registro.nome },
        create: registro,
        update: { grauIdeal: registro.grauIdeal },
      }),
    ),
  );

  revalidatePath(ROUTE);
  return { success: true, imported: registros.length };
}
