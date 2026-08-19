"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pacienteSchema } from "@/lib/validations/paciente";

const PAGE_SIZE = 10;

export async function listPacientes(filters: { q?: string }, page: number) {
  const where = filters.q
    ? {
        OR: [
          { nome: { contains: filters.q, mode: "insensitive" as const } },
          { cpf: { contains: filters.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { execucoes: true } } },
    }),
    prisma.paciente.count({ where }),
  ]);

  return {
    pacientes,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export type PacienteActionState = {
  error?: string;
  success?: boolean;
};

function parsePacienteForm(formData: FormData) {
  const idadeRaw = formData.get("idade");

  return pacienteSchema.safeParse({
    nome: formData.get("nome"),
    idade: idadeRaw ? String(idadeRaw) : undefined,
    dataNascimento: formData.get("dataNascimento") || undefined,
    cpf: formData.get("cpf") || undefined,
    email: formData.get("email") || undefined,
    contato: formData.get("contato") || undefined,
    endereco: formData.get("endereco") || undefined,
    historicoClinico: formData.get("historicoClinico") || undefined,
    objetivo: formData.get("objetivo") || undefined,
    doencasPreexistentes: formData.get("doencasPreexistentes") || undefined,
    cirurgiasAnteriores: formData.get("cirurgiasAnteriores") || undefined,
    medicamentos: formData.get("medicamentos") || undefined,
    numeroIndicacao: formData.get("numeroIndicacao") || undefined,
    pessoaIndicacao: formData.get("pessoaIndicacao") || undefined,
  });
}

export async function createPaciente(
  _prevState: PacienteActionState,
  formData: FormData,
): Promise<PacienteActionState> {
  const parsed = parsePacienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.paciente.create({
    data: {
      ...parsed.data,
      idade: parsed.data.idade ?? null,
      dataNascimento: parsed.data.dataNascimento
        ? new Date(parsed.data.dataNascimento)
        : null,
      cpf: parsed.data.cpf || null,
      email: parsed.data.email || null,
      endereco: parsed.data.endereco || null,
    },
  });

  revalidatePath("/pacientes");
  return { success: true };
}

export async function updatePaciente(
  id: string,
  _prevState: PacienteActionState,
  formData: FormData,
): Promise<PacienteActionState> {
  const parsed = parsePacienteForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.paciente.update({
    where: { id },
    data: {
      ...parsed.data,
      idade: parsed.data.idade ?? null,
      dataNascimento: parsed.data.dataNascimento
        ? new Date(parsed.data.dataNascimento)
        : null,
      cpf: parsed.data.cpf || null,
      email: parsed.data.email || null,
      endereco: parsed.data.endereco || null,
    },
  });

  revalidatePath("/pacientes");
  return { success: true };
}

export async function deletePaciente(id: string) {
  await prisma.paciente.delete({ where: { id } });
  revalidatePath("/pacientes");
}
