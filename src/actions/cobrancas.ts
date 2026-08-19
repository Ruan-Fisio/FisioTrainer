"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cobrancaSchema } from "@/lib/validations/cobranca";
import { aplicarTaxaNotaFiscal } from "@/lib/planos";

export type CobrancaActionState = {
  error?: string;
  success?: boolean;
};

export async function getCobrancasByPaciente(pacienteId: string) {
  const cobrancas = await prisma.cobranca.findMany({
    where: { pacienteId },
    orderBy: { vencimento: "desc" },
  });

  return cobrancas.map((c) => ({
    ...c,
    valor: Number(c.valor),
    valorBase: c.valorBase !== null ? Number(c.valorBase) : null,
  }));
}

/** Todas as cobranças pendentes (de qualquer paciente), para a tela de Cobranças. */
export async function listCobrancasPendentes() {
  const cobrancas = await prisma.cobranca.findMany({
    where: { status: "PENDENTE" },
    orderBy: { vencimento: "asc" },
    include: { paciente: { select: { id: true, nome: true, contato: true } } },
  });

  return cobrancas.map((c) => ({
    ...c,
    valor: Number(c.valor),
    valorBase: c.valorBase !== null ? Number(c.valorBase) : null,
  }));
}

export async function getCobranca(id: string) {
  const cobranca = await prisma.cobranca.findUnique({ where: { id } });
  if (!cobranca) return null;
  return {
    ...cobranca,
    valor: Number(cobranca.valor),
    valorBase: cobranca.valorBase !== null ? Number(cobranca.valorBase) : null,
  };
}

function parseForm(formData: FormData) {
  return cobrancaSchema.safeParse({
    planoNome: formData.get("planoNome"),
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    status: formData.get("status"),
    observacao: formData.get("observacao") ?? "",
    notaFiscal: formData.get("notaFiscal") ?? "false",
  });
}

export async function createCobranca(
  pacienteId: string,
  _prevState: CobrancaActionState,
  formData: FormData,
): Promise<CobrancaActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { status, valor: valorBase, notaFiscal, ...dados } = parsed.data;
  const valor = aplicarTaxaNotaFiscal(valorBase, notaFiscal);

  await prisma.cobranca.create({
    data: {
      ...dados,
      valorBase,
      valor,
      notaFiscal,
      status,
      pagoEm: status === "PAGO" ? new Date() : null,
      pacienteId,
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  return { success: true };
}

export async function updateCobranca(
  id: string,
  pacienteId: string,
  _prevState: CobrancaActionState,
  formData: FormData,
): Promise<CobrancaActionState> {
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.cobranca.findUnique({
    where: { id },
    select: { pacienteId: true, pagoEm: true },
  });

  if (!existing || existing.pacienteId !== pacienteId) {
    return { error: "Cobrança não encontrada." };
  }

  const { status, valor: valorBase, notaFiscal, ...dados } = parsed.data;
  const valor = aplicarTaxaNotaFiscal(valorBase, notaFiscal);

  await prisma.cobranca.update({
    where: { id },
    data: {
      ...dados,
      valorBase,
      valor,
      notaFiscal,
      status,
      pagoEm: status === "PAGO" ? (existing.pagoEm ?? new Date()) : null,
    },
  });

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
  return { success: true };
}

export async function marcarCobrancaPaga(id: string, pacienteId: string) {
  await prisma.cobranca.update({
    where: { id },
    data: { status: "PAGO", pagoEm: new Date() },
  });
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
}

export async function deleteCobranca(id: string, pacienteId: string) {
  await prisma.cobranca.delete({ where: { id } });
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/cobrancas");
}
