"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { decodificarAssinaturaPng } from "@/lib/contrato-regras";
import { pngDentroDoLimite } from "@/lib/assinatura-imagem";

export type AssinaturaActionState = { ok: true } | { ok: false; error: string };

/**
 * Assinatura do profissional usada nos documentos do paciente (docs/documentos.md).
 * As actions não recebem id de usuário: sempre agem sobre quem está logado, então
 * ninguém altera a assinatura de outro profissional.
 */

/** Grava uma nova versão (PNG transparente ≤ 900×300, ≤ 300 KB) e a torna a atual. */
export async function salvarMinhaAssinatura(dataUrl: string): Promise<AssinaturaActionState> {
  const usuario = await exigirSessao();
  const bytes = decodificarAssinaturaPng(dataUrl);
  if (!bytes || !pngDentroDoLimite(bytes)) {
    return { ok: false, error: "Assinatura inválida. Desenhe ou envie a foto de novo." };
  }

  await prisma.$transaction(async (tx) => {
    const versao = await tx.assinaturaProfissional.create({
      data: { userId: usuario.id, png: new Uint8Array(bytes) },
      select: { id: true },
    });
    await tx.user.update({
      where: { id: usuario.id },
      data: { assinaturaAtualId: versao.id },
    });
  });

  revalidatePath(`/usuarios/${usuario.id}`);
  return { ok: true };
}

/**
 * Desvincula a assinatura atual: os próximos documentos saem sem assinatura. A versão
 * continua no banco, porque documentos já emitidos apontam para ela.
 */
export async function removerMinhaAssinatura(): Promise<AssinaturaActionState> {
  const usuario = await exigirSessao();
  await prisma.user.update({
    where: { id: usuario.id },
    data: { assinaturaAtualId: null },
  });
  revalidatePath(`/usuarios/${usuario.id}`);
  return { ok: true };
}
