"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { feriadoSchema } from "@/lib/validations/funcionamento";
import { DIA_SEMANA_INFO } from "@/lib/funcionamento";
import type { DiaSemana } from "@/generated/prisma/enums";

export type FuncionamentoActionState = { error?: string; success?: boolean };

function revalidar() {
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

/** Os 7 dias da semana (ordem de exibição) com o flag `aberto` atual. */
export async function listDiasFuncionamento() {
  const salvos = await prisma.diaFuncionamento.findMany();
  const porDia = new Map(salvos.map((d) => [d.diaSemana, d.aberto]));

  return DIA_SEMANA_INFO.map((info) => ({
    diaSemana: info.valor,
    label: info.label,
    aberto: porDia.get(info.valor) ?? true,
  }));
}

export async function listFeriados() {
  return prisma.feriado.findMany({ orderBy: { data: "asc" } });
}

export async function setDiaFuncionamento(diaSemana: DiaSemana, aberto: boolean) {
  await prisma.diaFuncionamento.upsert({
    where: { diaSemana },
    update: { aberto },
    create: { diaSemana, aberto },
  });
  revalidar();
}

export async function createFeriado(
  _prev: FuncionamentoActionState,
  formData: FormData,
): Promise<FuncionamentoActionState> {
  const parsed = feriadoSchema.safeParse({
    data: formData.get("data"),
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = new Date(`${parsed.data.data}T00:00:00.000Z`);
  const existente = await prisma.feriado.findUnique({ where: { data } });
  if (existente) return { error: "Já existe um feriado cadastrado nessa data." };

  await prisma.feriado.create({ data: { data, descricao: parsed.data.descricao } });
  revalidar();
  return { success: true };
}

export async function deleteFeriado(id: string) {
  await prisma.feriado.delete({ where: { id } });
  revalidar();
}
