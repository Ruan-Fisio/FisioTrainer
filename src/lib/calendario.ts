import { addDays } from "date-fns";
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  inicioDaSemana,
  inicioDoDia,
  inicioDoMes,
} from "@/lib/datas-brasilia";

export type VisaoCalendario = "mes" | "semana" | "dia";

/**
 * Intervalo visível do calendário, sempre calculado no dia-calendário de Brasília
 * (nunca `date-fns startOfX / endOfX` ou `.setHours(...)` locais — o processo pode rodar
 * em UTC na Vercel, o que erraria a borda em até 3h. Ver seção "Fuso horário" do CLAUDE.md).
 */
export function getIntervaloVisivel(visao: VisaoCalendario, dataReferencia: Date) {
  if (visao === "mes") {
    return {
      inicio: inicioDaSemana(inicioDoMes(dataReferencia)),
      fim: fimDaSemana(fimDoMes(dataReferencia)),
    };
  }
  if (visao === "semana") {
    return {
      inicio: inicioDaSemana(dataReferencia),
      fim: fimDaSemana(dataReferencia),
    };
  }
  return { inicio: inicioDoDia(dataReferencia), fim: fimDoDia(dataReferencia) };
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
