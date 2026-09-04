import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Valida o token do link público de um paciente (rota /compartilhado/paciente/[token]).
 * Faz `notFound()` se o token não existe, foi revogado (`ativo: false`) ou expirou.
 *
 * Obs.: não gravamos `ultimoAcessoEm` aqui de propósito — toda escrita passa pela
 * trilha de auditoria (`src/lib/prisma.ts`) e um update a cada page view poluiria a
 * tela /logs.
 */
export async function resolverPacientePorToken(token: string) {
  const acesso = await prisma.acessoCompartilhadoPaciente.findUnique({
    where: { token },
    include: { paciente: true },
  });

  if (!acesso || !acesso.ativo) notFound();
  if (acesso.expiraEm && acesso.expiraEm.getTime() < Date.now()) notFound();

  return { pacienteId: acesso.pacienteId, paciente: acesso.paciente };
}
