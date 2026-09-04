"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { horarioAtendimentoSchema } from "@/lib/validations/horario-atendimento";
import { MODALIDADES_COM_HORARIO_FIXO } from "@/lib/salas";

export async function listHorariosAtendimentoAgrupados() {
  const horarios = await prisma.horarioAtendimento.findMany({
    where: { modalidade: { in: MODALIDADES_COM_HORARIO_FIXO } },
    orderBy: [{ modalidade: "asc" }, { ordem: "asc" }],
  });

  return MODALIDADES_COM_HORARIO_FIXO.map((modalidade) => ({
    modalidade,
    horarios: horarios.filter((h) => h.modalidade === modalidade),
  }));
}

export type HorarioAtendimentoActionState = { error?: string; success?: boolean };

export async function createHorarioAtendimento(
  _prevState: HorarioAtendimentoActionState,
  formData: FormData,
): Promise<HorarioAtendimentoActionState> {
  const parsed = horarioAtendimentoSchema.safeParse({
    modalidade: formData.get("modalidade"),
    horario: formData.get("horario"),
    duracaoMin: formData.get("duracaoMin") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existente = await prisma.horarioAtendimento.findUnique({
    where: {
      modalidade_horario: {
        modalidade: parsed.data.modalidade,
        horario: parsed.data.horario,
      },
    },
  });
  if (existente) {
    return { error: "Esse horário já está cadastrado para essa modalidade." };
  }

  const ultimo = await prisma.horarioAtendimento.findFirst({
    where: { modalidade: parsed.data.modalidade },
    orderBy: { ordem: "desc" },
  });

  await prisma.horarioAtendimento.create({
    data: { ...parsed.data, ordem: (ultimo?.ordem ?? -1) + 1 },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function alternarAtivoHorarioAtendimento(id: string, ativo: boolean) {
  await prisma.horarioAtendimento.update({ where: { id }, data: { ativo } });
  revalidatePath("/configuracoes");
}

export async function deleteHorarioAtendimento(id: string) {
  await prisma.horarioAtendimento.delete({ where: { id } });
  revalidatePath("/configuracoes");
}
