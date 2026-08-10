"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exercicioSchema } from "@/lib/validations/exercicio";

const PAGE_SIZE = 10;

export async function listExercicios(
  filters: { q?: string; categoriaIds?: string[] },
  page: number,
) {
  const where = {
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.categoriaIds && filters.categoriaIds.length > 0
      ? { categorias: { some: { id: { in: filters.categoriaIds } } } }
      : {}),
  };

  const [exercicios, total] = await Promise.all([
    prisma.exercicio.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        categorias: { select: { id: true, name: true } },
        _count: { select: { links: true } },
      },
    }),
    prisma.exercicio.count({ where }),
  ]);

  return {
    exercicios,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export type ExercicioActionState = {
  error?: string;
  success?: boolean;
};

function parseExercicioForm(formData: FormData) {
  const name = formData.get("name");
  const categoriaIdsRaw = formData.get("categoriaIds");
  const linksRaw = formData.get("links");

  let categoriaIds: unknown = [];
  let links: unknown = [];

  try {
    categoriaIds = categoriaIdsRaw ? JSON.parse(String(categoriaIdsRaw)) : [];
    links = linksRaw ? JSON.parse(String(linksRaw)) : [];
  } catch {
    return null;
  }

  return exercicioSchema.safeParse({ name, categoriaIds, links });
}

export async function createExercicio(
  _prevState: ExercicioActionState,
  formData: FormData,
): Promise<ExercicioActionState> {
  const parsed = parseExercicioForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.exercicio.create({
    data: {
      name: parsed.data.name,
      categorias: { connect: parsed.data.categoriaIds.map((id) => ({ id })) },
      links: { create: parsed.data.links },
    },
  });

  revalidatePath("/biblioteca/exercicios");
  return { success: true };
}

export async function updateExercicio(
  id: string,
  _prevState: ExercicioActionState,
  formData: FormData,
): Promise<ExercicioActionState> {
  const parsed = parseExercicioForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.$transaction([
    prisma.exercicioLink.deleteMany({ where: { exercicioId: id } }),
    prisma.exercicio.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categorias: {
          set: parsed.data.categoriaIds.map((categoriaId) => ({
            id: categoriaId,
          })),
        },
        links: { create: parsed.data.links },
      },
    }),
  ]);

  revalidatePath("/biblioteca/exercicios");
  return { success: true };
}

export async function deleteExercicio(id: string) {
  await prisma.exercicio.delete({ where: { id } });
  revalidatePath("/biblioteca/exercicios");
}
