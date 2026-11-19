/**
 * Período, dia e retenção das métricas de uso (spec 001). Tudo em Brasília
 * (docs/fuso-horario.md): nada de `getDate()`/`startOfDay` em instante real.
 */
import { inicioDoDia } from "@/lib/datas-brasilia";
import { toDateInputValue } from "@/lib/format";

export const PERIODOS_DIAS = [7, 30, 90, 365] as const;
export type PeriodoDias = (typeof PERIODOS_DIAS)[number];
export const PERIODO_PADRAO: PeriodoDias = 30;

/** Eventos brutos (`EventoUso`) vivem 90 dias; `UsoDiario` fica para sempre. */
export const RETENCAO_BRUTOS_DIAS = 90;

const DIA_MS = 24 * 60 * 60 * 1000;

/** `?dias=` → valor da whitelist (7/30/90/365); qualquer outra coisa → 30. */
export function parsePeriodo(valor: string | string[] | undefined | null): PeriodoDias {
  const v = Array.isArray(valor) ? valor[0] : valor;
  const n = Number(v);
  return (PERIODOS_DIAS as readonly number[]).includes(n) ? (n as PeriodoDias) : PERIODO_PADRAO;
}

/**
 * Dia (Brasília) de um instante, como data pura (meia-noite UTC) — o formato de uma
 * coluna `@db.Date` (`UsoDiario.dia`). 23:30 em Brasília é 02:30 UTC do dia seguinte e
 * mesmo assim cai no dia de Brasília.
 */
export function diaDaMetrica(instante: Date): Date {
  return new Date(`${toDateInputValue(instante)}T00:00:00.000Z`);
}

/** Intervalo dos últimos `dias` dias, incluindo hoje: do início do 1º dia até `agora`. */
export function intervaloPeriodo(dias: number, agora: Date = new Date()) {
  const inicio = inicioDoDia(new Date(agora.getTime() - (dias - 1) * DIA_MS));
  return { inicio, fim: agora, diaInicio: diaDaMetrica(inicio), diaFim: diaDaMetrica(agora) };
}

/** Eventos brutos criados antes deste instante já podem ser apagados. */
export function limitePurga(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - RETENCAO_BRUTOS_DIAS * DIA_MS);
}

/** Período acima da retenção dos brutos → usuários ativos/horário de pico ficam truncados. */
export function excedeRetencaoBrutos(dias: number): boolean {
  return dias > RETENCAO_BRUTOS_DIAS;
}
