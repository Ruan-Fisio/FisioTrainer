"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { gerarTokenPublico } from "@/lib/acesso-compartilhado";
import { exigirSessao } from "@/lib/sessao";

/** Retorna o link público ativo do paciente, criando um se ainda não existir. */
export async function getOuCriarAcessoPaciente(pacienteId: string) {
  await exigirSessao();

  const existente = await prisma.acessoCompartilhadoPaciente.findFirst({
    where: { pacienteId, ativo: true },
    orderBy: { criadoEm: "desc" },
  });
  if (existente) return existente;

  const criado = await prisma.acessoCompartilhadoPaciente.create({
    data: { pacienteId, token: gerarTokenPublico() },
  });
  revalidatePath(`/pacientes/${pacienteId}`);
  return criado;
}

/** Revoga um link (deixa de funcionar imediatamente). */
export async function revogarAcessoPaciente(acessoId: string) {
  await exigirSessao();

  const acesso = await prisma.acessoCompartilhadoPaciente.update({
    where: { id: acessoId },
    data: { ativo: false },
  });
  revalidatePath(`/pacientes/${acesso.pacienteId}`);
  return { success: true };
}

/** Links ativos do paciente (para o diálogo de compartilhamento). */
export async function listarAcessosPaciente(pacienteId: string) {
  await exigirSessao();

  return prisma.acessoCompartilhadoPaciente.findMany({
    where: { pacienteId, ativo: true },
    orderBy: { criadoEm: "desc" },
  });
}
