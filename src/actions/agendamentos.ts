"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  agendamentoSchema,
  combinarDataHora,
} from "@/lib/validations/agendamento";

const PAGE_SIZE = 10;

export type AgendamentoActionState = {
  error?: string;
  success?: boolean;
};

export async function listAgendamentos(
  filters: {
    pacienteIds?: string[];
    tipos?: string[];
    status?: string[];
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
    ...(filters.tipos && filters.tipos.length > 0
      ? { tipo: { in: filters.tipos as ("AVALIACAO" | "RETORNO" | "SESSAO")[] } }
      : {}),
    ...(filters.status && filters.status.length > 0
      ? {
          status: {
            in: filters.status as (
              | "AGENDADO"
              | "COMPARECEU"
              | "FALTOU"
              | "CANCELADO"
            )[],
          },
        }
      : {}),
    ...(dataFilter.gte || dataFilter.lte ? { dataHora: dataFilter } : {}),
  };

  const [agendamentos, total] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { paciente: { select: { id: true, nome: true } } },
    }),
    prisma.agendamento.count({ where }),
  ]);

  return {
    agendamentos,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}

export async function getAgendamentosByPaciente(pacienteId: string) {
  return prisma.agendamento.findMany({
    where: { pacienteId },
    orderBy: { dataHora: "desc" },
  });
}

export async function getAgendamento(id: string) {
  return prisma.agendamento.findUnique({ where: { id } });
}

function parseForm(formData: FormData) {
  return agendamentoSchema.safeParse({
    pacienteId: formData.get("pacienteId"),
    data: formData.get("data"),
    hora: formData.get("hora"),
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    observacao: formData.get("observacao") ?? "",
  });
}

function revalidar(pacienteId: string) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function createAgendamento(
  _prevState: AgendamentoActionState,
  formData: FormData,
): Promise<AgendamentoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, hora, ...dados } = parsed.data;

  await prisma.agendamento.create({
    data: { ...dados, dataHora: combinarDataHora(data, hora) },
  });

  revalidar(parsed.data.pacienteId);
  return { success: true };
}

export async function updateAgendamento(
  id: string,
  _prevState: AgendamentoActionState,
  formData: FormData,
): Promise<AgendamentoActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data, hora, ...dados } = parsed.data;

  await prisma.agendamento.update({
    where: { id },
    data: { ...dados, dataHora: combinarDataHora(data, hora) },
  });

  revalidar(parsed.data.pacienteId);
  return { success: true };
}

export async function deleteAgendamento(id: string) {
  const agendamento = await prisma.agendamento.delete({ where: { id } });
  revalidar(agendamento.pacienteId);
}
