"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { treinoSchema, atribuirTreinoSchema } from "@/lib/validations/treino";

const PAGE_SIZE = 10;

export async function listTreinos(filters: { q?: string }, page: number) {
  const where = {
    pacienteId: null,
    ...(filters.q
      ? { nome: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };

  const [treinos, total] = await Promise.all([
    prisma.treino.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { dias: true, copias: true } },
      },
    }),
    prisma.treino.count({ where }),
  ]);

  return {
    treinos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listAllTreinos() {
  return prisma.treino.findMany({
    where: { pacienteId: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
}

export async function getTreino(id: string) {
  return prisma.treino.findUnique({
    where: { id },
    include: {
      dias: {
        orderBy: { ordem: "asc" },
        include: {
          exercicios: {
            orderBy: { ordem: "asc" },
            include: {
              exercicio: { select: { id: true, name: true, links: true } },
            },
          },
        },
      },
    },
  });
}

export type TreinoActionState = {
  error?: string;
  success?: boolean;
};

function parseTreinoForm(formData: FormData) {
  const nome = formData.get("nome");
  const descricao = formData.get("descricao");
  const diasRaw = formData.get("dias");

  let dias: unknown = [];

  try {
    dias = diasRaw ? JSON.parse(String(diasRaw)) : [];
  } catch {
    return null;
  }

  return treinoSchema.safeParse({ nome, descricao, dias });
}

type TreinoFormData = ReturnType<typeof treinoSchema.parse>;

function diasCreateData(dias: TreinoFormData["dias"]) {
  return dias.map((dia, diaIndex) => ({
    diaSemana: dia.diaSemana,
    ordem: diaIndex,
    exercicios: {
      create: dia.exercicios.map((exercicio, exercicioIndex) => ({
        exercicioId: exercicio.exercicioId,
        ordem: exercicioIndex,
        series: exercicio.series ?? null,
        repeticoes: exercicio.repeticoes || null,
        carga: exercicio.carga ?? null,
        descanso: exercicio.descanso ?? null,
        instrucoes: exercicio.instrucoes || null,
      })),
    },
  }));
}

export async function createTreino(
  _prevState: TreinoActionState,
  formData: FormData,
): Promise<TreinoActionState> {
  const parsed = parseTreinoForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await prisma.treino.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao || null,
      dias: { create: diasCreateData(parsed.data.dias) },
    },
  });

  revalidatePath("/treinos");
  return { success: true };
}

async function updateTreinoInPlace(id: string, data: TreinoFormData) {
  await prisma.$transaction(async (tx) => {
    const existente = await tx.treino.findUniqueOrThrow({
      where: { id },
      include: { dias: { include: { exercicios: true } } },
    });

    await tx.treino.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
      },
    });

    const diaIdsRecebidos = new Set(data.dias.map((d) => d.id).filter(Boolean));
    for (const diaExistente of existente.dias) {
      if (!diaIdsRecebidos.has(diaExistente.id)) {
        await tx.treinoDia.delete({ where: { id: diaExistente.id } });
      }
    }

    for (const [diaIndex, diaInput] of data.dias.entries()) {
      const diaExistente = existente.dias.find((d) => d.id === diaInput.id);

      const diaId = diaExistente
        ? diaExistente.id
        : (
            await tx.treinoDia.create({
              data: { diaSemana: diaInput.diaSemana, ordem: diaIndex, treinoId: id },
            })
          ).id;

      if (diaExistente) {
        await tx.treinoDia.update({
          where: { id: diaId },
          data: { diaSemana: diaInput.diaSemana, ordem: diaIndex },
        });
      }

      const exerciciosExistentes = diaExistente?.exercicios ?? [];
      const exercicioIdsRecebidos = new Set(
        diaInput.exercicios.map((e) => e.id).filter(Boolean),
      );
      for (const exercicioExistente of exerciciosExistentes) {
        if (!exercicioIdsRecebidos.has(exercicioExistente.id)) {
          await tx.treinoDiaExercicio.delete({
            where: { id: exercicioExistente.id },
          });
        }
      }

      for (const [exercicioIndex, exercicioInput] of diaInput.exercicios.entries()) {
        const exercicioExistente = exerciciosExistentes.find(
          (e) => e.id === exercicioInput.id,
        );
        const exercicioData = {
          exercicioId: exercicioInput.exercicioId,
          ordem: exercicioIndex,
          series: exercicioInput.series ?? null,
          repeticoes: exercicioInput.repeticoes || null,
          carga: exercicioInput.carga ?? null,
          descanso: exercicioInput.descanso ?? null,
          instrucoes: exercicioInput.instrucoes || null,
        };

        if (exercicioExistente) {
          await tx.treinoDiaExercicio.update({
            where: { id: exercicioExistente.id },
            data: exercicioData,
          });
        } else {
          await tx.treinoDiaExercicio.create({
            data: { ...exercicioData, treinoDiaId: diaId },
          });
        }
      }
    }
  });
}

export async function updateTreino(
  id: string,
  _prevState: TreinoActionState,
  formData: FormData,
): Promise<TreinoActionState> {
  const parsed = parseTreinoForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await updateTreinoInPlace(id, parsed.data);

  revalidatePath("/treinos");
  return { success: true };
}

export async function deleteTreino(id: string) {
  await prisma.treino.delete({ where: { id } });
  revalidatePath("/treinos");
}

export type AtribuirTreinoActionState = {
  error?: string;
  success?: boolean;
};

export async function assignTreino(
  _prevState: AtribuirTreinoActionState,
  formData: FormData,
): Promise<AtribuirTreinoActionState> {
  const treinoIdsRaw = formData.get("treinoIds");
  let treinoIds: unknown = [];

  try {
    treinoIds = treinoIdsRaw ? JSON.parse(String(treinoIdsRaw)) : [];
  } catch {
    return { error: "Dados inválidos." };
  }

  const parsed = atribuirTreinoSchema.safeParse({
    treinoIds,
    pacienteId: formData.get("pacienteId"),
    dataInicio: formData.get("dataInicio"),
    dataFim: formData.get("dataFim"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { treinoIds: idsSelecionados, pacienteId, dataInicio, dataFim } = parsed.data;

  const modelos = await prisma.treino.findMany({
    where: { id: { in: idsSelecionados }, pacienteId: null },
    include: {
      dias: {
        orderBy: { ordem: "asc" },
        include: { exercicios: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (modelos.length === 0) {
    return { error: "Nenhum treino válido selecionado." };
  }

  await prisma.$transaction(async (tx) => {
    for (const modelo of modelos) {
      await tx.treino.create({
        data: {
          nome: modelo.nome,
          descricao: modelo.descricao,
          pacienteId,
          treinoOrigemId: modelo.id,
          dataInicio: dataInicio ? new Date(dataInicio) : null,
          dataFim: dataFim ? new Date(dataFim) : null,
          dias: {
            create: modelo.dias.map((dia) => ({
              diaSemana: dia.diaSemana,
              ordem: dia.ordem,
              exercicios: {
                create: dia.exercicios.map((exercicio) => ({
                  exercicioId: exercicio.exercicioId,
                  ordem: exercicio.ordem,
                  series: exercicio.series,
                  repeticoes: exercicio.repeticoes,
                  carga: exercicio.carga,
                  descanso: exercicio.descanso,
                  instrucoes: exercicio.instrucoes,
                })),
              },
            })),
          },
        },
      });
    }
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath(`/pacientes/${pacienteId}/treinos`);
  return { success: true };
}
