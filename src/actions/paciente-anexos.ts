"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  criarTicketUpload,
  excluirAnexo,
  listarAnexosComUrls,
  registrarAnexo,
  type AnexoPacienteItem,
} from "@/lib/paciente-anexos";

/** Anexos do histórico clínico, lado da clínica (exige sessão). */

async function exigirSessao() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado.");
}

export type AnexoPaciente = AnexoPacienteItem;

/** Todos os anexos do paciente (os da clínica e os enviados pelo paciente no portal). */
export async function listarAnexosPaciente(
  pacienteId: string,
): Promise<AnexoPaciente[]> {
  await exigirSessao();
  return listarAnexosComUrls(pacienteId);
}

/** Passo 1 (usar com `.bind(null, pacienteId)`): URL assinada para o upload. */
export async function solicitarUploadAnexoPaciente(
  pacienteId: string,
  input: { nome: string; mime: string; tamanho: number },
) {
  await exigirSessao();
  return criarTicketUpload(pacienteId, input);
}

/** Passo 2 (usar com `.bind(null, pacienteId)`): vincula o arquivo enviado. */
export async function confirmarAnexoPaciente(
  pacienteId: string,
  input: { chave: string; nomeOriginal: string },
): Promise<{ error: string } | { success: true }> {
  await exigirSessao();
  const res = await registrarAnexo({
    pacienteId,
    chave: input.chave,
    nomeOriginal: input.nomeOriginal,
    origem: "CLINICA",
  });
  if ("success" in res) revalidatePath(`/pacientes/${pacienteId}`);
  return res;
}

export async function removerAnexoPaciente(
  anexoId: string,
): Promise<{ error: string } | { success: true }> {
  await exigirSessao();

  const anexo = await prisma.pacienteAnexo.findUnique({
    where: { id: anexoId },
  });
  if (!anexo) return { error: "Anexo não encontrado." };

  await excluirAnexo(anexo);
  revalidatePath(`/pacientes/${anexo.pacienteId}`);
  return { success: true };
}
