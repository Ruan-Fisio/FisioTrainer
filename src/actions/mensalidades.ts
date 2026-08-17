"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { mensalidadeSchema } from "@/lib/validations/mensalidade";

export type MensalidadeActionState = {
  error?: string;
  success?: boolean;
};

export async function getMensalidadesByPaciente(pacienteId: string) {
  const mensalidades = await prisma.mensalidade.findMany({
    where: { pacienteId },
    orderBy: { vencimento: "desc" },
  });

  return mensalidades.map((m) => ({ ...m, valor: Number(m.valor) }));
}

export async function getMensalidade(id: string) {
  const mensalidade = await prisma.mensalidade.findUnique({ where: { id } });
  return mensalidade ? { ...mensalidade, valor: Number(mensalidade.valor) } : null;
}

function parseForm(formData: FormData) {
  return mensalidadeSchema.safeParse({
    planoNome: formData.get("planoNome"),
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    status: formData.get("status"),
    observacao: formData.get("observacao") ?? "",
  });
}

export async function createMensalidade(
  pacienteId: string,
  _prevState: MensalidadeActionState,
  formData: FormData,
): Promise<MensalidadeActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { status, ...dados } = parsed.data;

  await prisma.mensalidade.create({
    data: {
      ...dados,
      status,
      pagoEm: status === "PAGO" ? new Date() : null,
      pacienteId,
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateMensalidade(
  id: string,
  pacienteId: string,
  _prevState: MensalidadeActionState,
  formData: FormData,
): Promise<MensalidadeActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.mensalidade.findUnique({
    where: { id },
    select: { pacienteId: true, pagoEm: true },
  });

  if (!existing || existing.pacienteId !== pacienteId) {
    return { error: "Mensalidade não encontrada." };
  }

  const { status, ...dados } = parsed.data;

  await prisma.mensalidade.update({
    where: { id },
    data: {
      ...dados,
      status,
      pagoEm: status === "PAGO" ? (existing.pagoEm ?? new Date()) : null,
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function marcarMensalidadePaga(id: string, pacienteId: string) {
  await prisma.mensalidade.update({
    where: { id },
    data: { status: "PAGO", pagoEm: new Date() },
  });
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
}

export async function deleteMensalidade(id: string, pacienteId: string) {
  await prisma.mensalidade.delete({ where: { id } });
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
}
