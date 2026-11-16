"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  criarAgendamentoAssistido,
  desmarcarAgendamentoPeloPaciente,
  getConsumoPlanoPaciente,
  getDadosAgendamentoAssistido,
  getDisponibilidadeHorarios,
  getDisponibilidadeMesAssistido,
} from "@/actions/agendamentos";

/**
 * Actions de agendamento que os componentes compartilhados entre clínica e portal
 * chamam do navegador. Fora do portal são as actions normais (sessão da clínica); no
 * portal, a página injeta as versões presas ao token (`src/actions/portal-agendamentos.ts`).
 */
const ACOES_CLINICA = {
  getConsumoPlanoPaciente,
  desmarcarAgendamentoPeloPaciente,
  getDadosAgendamentoAssistido,
  getDisponibilidadeMesAssistido,
  getDisponibilidadeHorarios,
  criarAgendamentoAssistido,
};

export type AcoesAgendamento = typeof ACOES_CLINICA;

const Contexto = createContext<AcoesAgendamento>(ACOES_CLINICA);

export function AcoesPortalProvider({
  acoes,
  children,
}: {
  acoes: AcoesAgendamento;
  children: ReactNode;
}) {
  return <Contexto.Provider value={acoes}>{children}</Contexto.Provider>;
}

export function useAcoesAgendamento() {
  return useContext(Contexto);
}
