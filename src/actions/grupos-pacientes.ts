"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { grupoPacienteSchema } from "@/lib/validations/grupo-paciente";

const PAGE_SIZE = 10;

export async function listGruposPacientes(filters: { q?: string }, page: number) {
  const where = {
    ...(filters.q
      ? { nome: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };

  const [grupos, total] = await Promise.all([
    prisma.grupoPaciente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { pacientes: { select: { id: true, nome: true } } },
    }),
    prisma.grupoPaciente.count({ where }),
  ]);

  return {
    grupos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function listGruposPacientesOptions() {
  return prisma.grupoPaciente.findMany({
    orderBy: { nome: "asc" },
    include: { pacientes: { select: { id: true, nome: true } } },
  });
}

export async function getGrupoPaciente(id: string) {
  return prisma.grupoPaciente.findUnique({
    where: { id },
    include: { pacientes: { select: { id: true, nome: true } } },
  });
}

export type GrupoPacienteActionState = {
  error?: string;
  success?: boolean;
};

function parseForm(formData: FormData) {
  const pacienteIdsRaw = formData.get("pacienteIds");
  let pacienteIds: unknown = [];

  try {
    pacienteIds = pacienteIdsRaw ? JSON.parse(String(pacienteIdsRaw)) : [];
  } catch {
    return null;
  }

  return grupoPacienteSchema.safeParse({
    nome: formData.get("nome"),
    pacienteIds,
  });
}

export async function createGrupoPaciente(
  _prevState: GrupoPacienteActionState,
  formData: FormData,
): Promise<GrupoPacienteActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.grupoPaciente.create({
    data: {
      nome: parsed.data.nome,
      pacientes: { connect: parsed.data.pacienteIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/agenda/grupos");
  return { success: true };
}

export async function updateGrupoPaciente(
  id: string,
  _prevState: GrupoPacienteActionState,
  formData: FormData,
): Promise<GrupoPacienteActionState> {
  const parsed = parseForm(formData);

  if (!parsed || !parsed.success) {
    return { error: parsed?.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.grupoPaciente.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      pacientes: { set: parsed.data.pacienteIds.map((pacienteId) => ({ id: pacienteId })) },
    },
  });

  revalidatePath("/agenda/grupos");
  return { success: true };
}

export async function deleteGrupoPaciente(id: string) {
  await prisma.grupoPaciente.delete({ where: { id } });
  revalidatePath("/agenda/grupos");
}
