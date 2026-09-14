/**
 * Limites de dia/semana/mês no fuso da clínica (America/Sao_Paulo), calculados sem
 * depender do fuso do processo — na Vercel o runtime das server actions pode continuar
 * em UTC mesmo com `process.env.TZ` no next.config, e aí `date-fns` sozinho calcularia
 * a borda no dia errado.
 *
 * `toZonedTime` "traduz" o instante para os campos de calendário de Brasília (ano, mês,
 * dia, hora...); as funções puras do `date-fns` (`startOfDay`, `startOfWeek`, ...) então
 * operam nesses campos; `fromZonedTime` converte de volta pro instante real (UTC), lendo
 * os mesmos campos como se fossem horário de Brasília — nenhum dos dois passos depende
 * do fuso do processo. Nunca reimplementar esse cálculo à mão (string com offset,
 * `Date.UTC`, `getUTCDate` etc.) — usar sempre os helpers deste arquivo.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { TIMEZONE } from "@/lib/format";

export function inicioDoDia(d: Date = new Date()): Date {
  return fromZonedTime(startOfDay(toZonedTime(d, TIMEZONE)), TIMEZONE);
}

export function fimDoDia(d: Date = new Date()): Date {
  return fromZonedTime(endOfDay(toZonedTime(d, TIMEZONE)), TIMEZONE);
}

/** Início do domingo da semana que contém `d` (semana começa no domingo). */
export function inicioDaSemana(d: Date = new Date()): Date {
  return fromZonedTime(
    startOfWeek(toZonedTime(d, TIMEZONE), { weekStartsOn: 0 }),
    TIMEZONE,
  );
}

/** Fim do sábado da semana que contém `d` (semana começa no domingo). */
export function fimDaSemana(d: Date = new Date()): Date {
  return fromZonedTime(endOfWeek(toZonedTime(d, TIMEZONE), { weekStartsOn: 0 }), TIMEZONE);
}

/** Primeiro instante do mês que contém `d`. */
export function inicioDoMes(d: Date = new Date()): Date {
  return fromZonedTime(startOfMonth(toZonedTime(d, TIMEZONE)), TIMEZONE);
}

/** Fim do último dia do mês que contém `d`. */
export function fimDoMes(d: Date = new Date()): Date {
  return fromZonedTime(endOfMonth(toZonedTime(d, TIMEZONE)), TIMEZONE);
}

/** Primeiro instante do mês seguinte ao que contém `d`. */
export function inicioDoProximoMes(d: Date = new Date()): Date {
  return fromZonedTime(startOfMonth(addMonths(toZonedTime(d, TIMEZONE), 1)), TIMEZONE);
}

/** Ano e mês (1-12) do instante `d`, no fuso da clínica — nunca `d.getFullYear()`/`getMonth()`. */
export function anoMesBrasilia(d: Date = new Date()): { ano: number; mes: number } {
  const zoned = toZonedTime(d, TIMEZONE);
  return { ano: zoned.getFullYear(), mes: zoned.getMonth() + 1 };
}

/**
 * Primeiro instante do dia "ano-mes-dia" (todos 1-based), no fuso da clínica — para
 * construir uma borda de intervalo a partir de campos numéricos (ex. um mês vindo de um
 * `<select>`) sem cair no parse sem-offset (`new Date(ano, mes-1, dia)`, que interpreta os
 * componentes no fuso do processo).
 */
export function dataBrasilia(ano: number, mes: number, dia = 1): Date {
  return fromZonedTime(new Date(ano, mes - 1, dia), TIMEZONE);
}
