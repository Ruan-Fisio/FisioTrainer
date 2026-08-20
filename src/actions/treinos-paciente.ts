"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { treinoSchema } from "@/lib/validations/treino";

export async function listTreinosPaciente(pacienteId: string) {
  return prisma.treino.findMany({
    where: { pacienteId, ativo: true },
    orderBy: { createdAt: "desc" },
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

export async function getTreinoPaciente(id: string, pacienteId: string) {
  const treino = await prisma.treino.findUnique({
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

  if (!treino || treino.pacienteId !== pacienteId) return null;

  return treino;
}

export type TreinoPacienteActionState = {
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

export async function updateTreinoPaciente(
  id: string,
  pacienteId: string,
  _prevState: TreinoPacienteActionState,
  formData: FormData,
): Promise<TreinoPacienteActionState> {
  const treino = await prisma.treino.findUnique({ where: { id } });
  if (!treino || treino.pacienteId !== pacienteId) {
    return { error: "Treino não encontrado para este paciente." };
  }

  const parsed = parseTreinoForm(formData);

  if (!parsed || !parsed.success) {
    return {
      error: parsed?.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  await updateTreinoPacienteInPlace(id, parsed.data);

  revalidatePath(`/pacientes/${pacienteId}/treinos`);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

async function updateTreinoPacienteInPlace(id: string, data: TreinoFormData) {
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

export async function desativarTreinoPaciente(id: string, pacienteId: string) {
  const treino = await prisma.treino.findUnique({ where: { id } });
  if (!treino || treino.pacienteId !== pacienteId) {
    throw new Error("Treino não encontrado para este paciente.");
  }

  await prisma.treino.update({ where: { id }, data: { ativo: false } });
  revalidatePath(`/pacientes/${pacienteId}/treinos`);
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function deleteTreinoPaciente(id: string, pacienteId: string) {
  const treino = await prisma.treino.findUnique({ where: { id } });
  if (!treino || treino.pacienteId !== pacienteId) {
    throw new Error("Treino não encontrado para este paciente.");
  }

  await prisma.treino.delete({ where: { id } });
  revalidatePath(`/pacientes/${pacienteId}/treinos`);
  revalidatePath(`/pacientes/${pacienteId}`);
}
