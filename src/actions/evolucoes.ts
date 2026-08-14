"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { evolucaoSchema } from "@/lib/validations/evolucao";

const PAGE_SIZE = 10;
const SEM_USUARIO_ID = "sem-usuario";

export async function listEvolucoes(
  filters: {
    pacienteIds?: string[];
    profissionalIds?: string[];
    de?: string;
    ate?: string;
  },
  page: number,
) {
  const dataFilter: { gte?: Date; lte?: Date } = {};
  if (filters.de) dataFilter.gte = new Date(`${filters.de}T00:00:00`);
  if (filters.ate) dataFilter.lte = new Date(`${filters.ate}T23:59:59`);

  const where = {
    ...(filters.pacienteIds && filters.pacienteIds.length > 0
      ? { pacienteId: { in: filters.pacienteIds } }
      : {}),
    ...(filters.profissionalIds && filters.profissionalIds.length > 0
      ? { profissionalId: { in: filters.profissionalIds } }
      : {}),
    ...(dataFilter.gte || dataFilter.lte ? { data: dataFilter } : {}),
  };

  const [evolucoes, total] = await Promise.all([
    prisma.evolucao.findMany({
      where,
      orderBy: { data: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        paciente: { select: { id: true, nome: true } },
        profissional: { select: { id: true, name: true } },
      },
    }),
    prisma.evolucao.count({ where }),
  ]);

  return {
    evolucoes,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function getEvolucoesByPaciente(pacienteId: string) {
  return prisma.evolucao.findMany({
    where: { pacienteId },
    orderBy: { data: "desc" },
    include: {
      profissional: { select: { id: true, name: true } },
    },
  });
}

export async function getEvolucao(id: string) {
  return prisma.evolucao.findUnique({
    where: { id },
    include: {
      paciente: { select: { id: true, nome: true } },
      profissional: { select: { id: true, name: true } },
    },
  });
}

export type EvolucaoActionState = {
  error?: string;
  success?: boolean;
};

export async function createEvolucao(
  pacienteId: string,
  _prevState: EvolucaoActionState,
  formData: FormData,
): Promise<EvolucaoActionState> {
  const parsed = evolucaoSchema.safeParse({
    hdp: formData.get("hdp"),
    hda: formData.get("hda"),
    pa: formData.get("pa"),
    fc: formData.get("fc"),
    spo2: formData.get("spo2"),
    fr: formData.get("fr"),
    temperatura: formData.get("temperatura"),
    evolucao: formData.get("evolucao"),
    conduta: formData.get("conduta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const session = await auth();
  const usuario = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;
  const profissionalId = usuario?.id ?? SEM_USUARIO_ID;

  await prisma.evolucao.create({
    data: { ...parsed.data, pacienteId, profissionalId },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/evolucoes");
  return { success: true };
}

export async function updateEvolucao(
  id: string,
  pacienteId: string,
  _prevState: EvolucaoActionState,
  formData: FormData,
): Promise<EvolucaoActionState> {
  const parsed = evolucaoSchema.safeParse({
    hdp: formData.get("hdp"),
    hda: formData.get("hda"),
    pa: formData.get("pa"),
    fc: formData.get("fc"),
    spo2: formData.get("spo2"),
    fr: formData.get("fr"),
    temperatura: formData.get("temperatura"),
    evolucao: formData.get("evolucao"),
    conduta: formData.get("conduta"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.evolucao.findUnique({
    where: { id },
    select: { pacienteId: true },
  });

  if (!existing || existing.pacienteId !== pacienteId) {
    return { error: "Evolução não encontrada." };
  }

  await prisma.evolucao.update({ where: { id }, data: parsed.data });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/evolucoes");
  return { success: true };
}

export async function deleteEvolucao(id: string, pacienteId: string) {
  await prisma.evolucao.delete({ where: { id } });
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/evolucoes");
}
