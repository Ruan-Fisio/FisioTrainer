"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buscarPacienteIdPorToken } from "@/lib/acesso-compartilhado";
import {
  criarTicketUpload,
  excluirAnexo,
  registrarAnexo,
} from "@/lib/paciente-anexos";

/**
 * Anexos enviados pelo próprio paciente no portal público
 * (/compartilhado/paciente/[token]). Sem sessão: toda action recebe o token
 * (use `.bind(null, token)`) e o paciente é SEMPRE derivado dele no servidor —
 * nunca de um id vindo do navegador. O paciente só remove o que ele enviou.
 */

const NAO_AUTORIZADO = { error: "Link inválido ou expirado." };

export async function solicitarUploadAnexoPortal(
  token: string,
  input: { nome: string; mime: string; tamanho: number },
) {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) return NAO_AUTORIZADO;
  return criarTicketUpload(pacienteId, input);
}

export async function confirmarAnexoPortal(
  token: string,
  input: { chave: string; nomeOriginal: string },
): Promise<{ error: string } | { success: true }> {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) return NAO_AUTORIZADO;

  const res = await registrarAnexo({
    pacienteId,
    chave: input.chave,
    nomeOriginal: input.nomeOriginal,
    origem: "PACIENTE",
  });
  if ("success" in res) {
    revalidatePath(`/compartilhado/paciente/${token}`);
    revalidatePath(`/pacientes/${pacienteId}`);
  }
  return res;
}

export async function removerAnexoPortal(
  token: string,
  anexoId: string,
): Promise<{ error: string } | { success: true }> {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) return NAO_AUTORIZADO;

  const anexo = await prisma.pacienteAnexo.findFirst({
    where: { id: anexoId, pacienteId, origem: "PACIENTE" },
  });
  if (!anexo) return { error: "Anexo não encontrado." };

  await excluirAnexo(anexo);
  revalidatePath(`/compartilhado/paciente/${token}`);
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}
