"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { treinoSchema } from "@/lib/validations/treino";
import { updateTreinoInPlace } from "@/lib/treino-persistence";

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

  await updateTreinoInPlace(id, parsed.data);

  revalidatePath(`/pacientes/${pacienteId}/treinos`);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
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
