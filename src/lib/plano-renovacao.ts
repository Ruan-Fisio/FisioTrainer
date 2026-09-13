/**
 * Regra pura: um plano atribuído está "vencido / pronto para renovar" quando todo o
 * período já foi cumprido — todos os atendimentos executados (Compareceu ou Faltou) e
 * todas as cobranças pagas. Usado pela aba Renovações de `/planos` (só um lembrete para a
 * clínica) e revalidado no server antes de renovar.
 */
import { MESES_COBERTURA_GRADE, orcamentoGrade } from "./grade-recorrente";

/** Total de atendimentos do plano no período: `atendimentos × meses` (1 MENSAL / 3 TRIMESTRAL). */
export function totalAtendimentosPlano(
  atendimentos: number | null,
  periodicidade: string,
): number | null {
  return orcamentoGrade(atendimentos, MESES_COBERTURA_GRADE[periodicidade] ?? 1);
}

const STATUS_REALIZADO = new Set(["COMPARECEU", "FALTOU"]);

export function contarRealizados(agendamentos: { status: string }[]): number {
  return agendamentos.filter((a) => STATUS_REALIZADO.has(a.status)).length;
}

export function planoRenovavel(p: {
  atendimentos: number | null;
  periodicidade: string;
  cobrancas: { status: string }[];
  agendamentos: { status: string }[];
}): boolean {
  if (p.cobrancas.length === 0) return false;
  if (!p.cobrancas.every((c) => c.status === "PAGO")) return false;
  if (p.agendamentos.some((a) => a.status === "AGENDADO")) return false;

  const realizados = contarRealizados(p.agendamentos);
  const total = totalAtendimentosPlano(p.atendimentos, p.periodicidade);
  return realizados >= (total ?? 1);
}
