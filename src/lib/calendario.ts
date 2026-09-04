import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type VisaoCalendario = "mes" | "semana" | "dia";

export function getIntervaloVisivel(visao: VisaoCalendario, dataReferencia: Date) {
  if (visao === "mes") {
    const inicio = startOfWeek(startOfMonth(dataReferencia), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(dataReferencia), { weekStartsOn: 0 });
    return { inicio, fim };
  }
  if (visao === "semana") {
    return {
      inicio: startOfWeek(dataReferencia, { weekStartsOn: 0 }),
      fim: endOfWeek(dataReferencia, { weekStartsOn: 0 }),
    };
  }
  const inicio = new Date(dataReferencia);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(dataReferencia);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

export function getDiasDaGrade(inicio: Date, fim: Date) {
  const dias: Date[] = [];
  let cursor = inicio;
  while (cursor <= fim) {
    dias.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dias;
}

export const HORAS_DO_DIA = Array.from({ length: 24 }, (_, hora) => hora);
