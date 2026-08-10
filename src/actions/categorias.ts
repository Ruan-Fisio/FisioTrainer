"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { categoriaSchema } from "@/lib/validations/categoria";

const PAGE_SIZE = 10;

export async function listCategorias(filters: { q?: string }, page: number) {
  const where = filters.q
    ? { name: { contains: filters.q, mode: "insensitive" as const } }
    : {};

  const [categorias, total] = await Promise.all([
    prisma.categoria.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { exercicios: true } } },
    }),
    prisma.categoria.count({ where }),
  ]);

  return {
    categorias,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listAllCategorias() {
  return prisma.categoria.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type CategoriaActionState = {
  error?: string;
  success?: boolean;
};

export async function createCategoria(
  _prevState: CategoriaActionState,
  formData: FormData,
): Promise<CategoriaActionState> {
  const parsed = categoriaSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.categoria.findUnique({
    where: { name: parsed.data.name },
  });

  if (existing) {
    return { error: "Já existe uma categoria com este nome." };
  }

  await prisma.categoria.create({ data: parsed.data });

  revalidatePath("/biblioteca/categorias");
  return { success: true };
}

export async function updateCategoria(
  id: string,
  _prevState: CategoriaActionState,
  formData: FormData,
): Promise<CategoriaActionState> {
  const parsed = categoriaSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.categoria.findUnique({
    where: { name: parsed.data.name },
  });

  if (existing && existing.id !== id) {
    return { error: "Já existe uma categoria com este nome." };
  }

  await prisma.categoria.update({ where: { id }, data: parsed.data });

  revalidatePath("/biblioteca/categorias");
  return { success: true };
}

export async function deleteCategoria(id: string) {
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { _count: { select: { exercicios: true } } },
  });

  if (!categoria) return;

  if (categoria._count.exercicios > 0) {
    throw new Error("Categoria em uso não pode ser excluída.");
  }

  await prisma.categoria.delete({ where: { id } });
  revalidatePath("/biblioteca/categorias");
}
