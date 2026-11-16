"use server";

import { prisma } from "@/lib/prisma";
import { buscarPacienteIdPorToken } from "@/lib/acesso-compartilhado";
import { comAcessoPortal } from "@/lib/sessao";
import {
  criarAgendamentoAssistido,
  desmarcarAgendamentoPeloPaciente,
  getConsumoPlanoPaciente,
  getDadosAgendamentoAssistido,
  getDisponibilidadeHorarios,
  getDisponibilidadeMesAssistido,
} from "@/actions/agendamentos";

/**
 * Versões para o portal público (/compartilhado/paciente/[token]) das actions de
 * agendamento que o navegador chama. Sem sessão: o token vem primeiro (`.bind(null,
 * token)` na página) e o paciente é SEMPRE derivado dele no servidor — o `pacienteId`
 * que o client manda é ignorado. As actions originais rodam dentro de
 * `comAcessoPortal`, que só libera o paciente do token (`exigirSessaoOuPortal`).
 *
 * As assinaturas (depois do token) são idênticas às originais, para o portal injetar
 * estas no lugar delas via `AcoesPortalProvider`.
 */

class LinkInvalidoError extends Error {
  constructor() {
    super("Link inválido ou expirado.");
  }
}

async function pacienteDoToken(token: string) {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) throw new LinkInvalidoError();
  return pacienteId;
}

/** Plano informado pelo client precisa ser do paciente do token. */
async function exigirPlanoDoPaciente(planoAtribuicaoId: string | undefined, pacienteId: string) {
  if (!planoAtribuicaoId) return;
  const plano = await prisma.planoAtribuicao.findFirst({
    where: { id: planoAtribuicaoId, pacienteId },
    select: { id: true },
  });
  if (!plano) throw new LinkInvalidoError();
}

export async function portalGetConsumoPlanoPaciente(
  token: string,
  _pacienteId: string,
  ano: number,
  mes: number,
) {
  const pacienteId = await pacienteDoToken(token);
  return comAcessoPortal(pacienteId, () => getConsumoPlanoPaciente(pacienteId, ano, mes));
}

export async function portalDesmarcarAgendamento(
  token: string,
  agendamentoId: string,
  _pacienteId: string,
  justificativa: string,
) {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) return { error: "Link inválido ou expirado." };
  return comAcessoPortal(pacienteId, () =>
    desmarcarAgendamentoPeloPaciente(agendamentoId, pacienteId, justificativa),
  );
}

export async function portalGetDadosAgendamentoAssistido(token: string, _pacienteId: string) {
  const pacienteId = await pacienteDoToken(token);
  return comAcessoPortal(pacienteId, () => getDadosAgendamentoAssistido(pacienteId));
}

export async function portalGetDisponibilidadeMesAssistido(
  token: string,
  params: Parameters<typeof getDisponibilidadeMesAssistido>[0],
) {
  const pacienteId = await pacienteDoToken(token);
  await exigirPlanoDoPaciente(params.planoAtribuicaoId, pacienteId);
  return comAcessoPortal(pacienteId, () => getDisponibilidadeMesAssistido(params));
}

export async function portalGetDisponibilidadeHorarios(
  token: string,
  data: string,
  modalidade: Parameters<typeof getDisponibilidadeHorarios>[1],
  excludeId?: string,
  planoAtribuicaoId?: string,
) {
  const pacienteId = await pacienteDoToken(token);
  await exigirPlanoDoPaciente(planoAtribuicaoId, pacienteId);
  // O portal não remarca: nada de excluir um agendamento (de quem quer que seja) do cálculo.
  return comAcessoPortal(pacienteId, () =>
    getDisponibilidadeHorarios(data, modalidade, undefined, planoAtribuicaoId),
  );
}

export async function portalCriarAgendamentoAssistido(
  token: string,
  params: Parameters<typeof criarAgendamentoAssistido>[0],
) {
  const pacienteId = await buscarPacienteIdPorToken(token);
  if (!pacienteId) return { error: "Link inválido ou expirado." };
  return comAcessoPortal(pacienteId, () => criarAgendamentoAssistido({ ...params, pacienteId }));
}
