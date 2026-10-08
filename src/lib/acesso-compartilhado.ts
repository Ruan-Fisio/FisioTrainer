import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Versão sem `notFound()` para server actions do portal: devolve o id do
 * paciente dono do link, ou null se o token não existe/foi revogado/expirou.
 * Toda escrita pública deve derivar o paciente DAQUI, nunca de um id do client.
 */
export async function buscarPacienteIdPorToken(token: string) {
  const acesso = await prisma.acessoCompartilhadoPaciente.findUnique({
    where: { token },
    select: { pacienteId: true, ativo: true, expiraEm: true },
  });
  if (!acesso || !acesso.ativo) return null;
  if (acesso.expiraEm && acesso.expiraEm.getTime() < Date.now()) return null;
  return acesso.pacienteId;
}

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
