import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarWeeks,
  isAfter,
} from "date-fns";

export type UnidadeRecorrencia = "DIA" | "SEMANA" | "MES" | "ANO";
export type TerminoRecorrencia = "NUNCA" | "EM_DATA" | "APOS_N";

export type RegraRecorrencia = {
  intervalo: number;
  unidade: UnidadeRecorrencia;
  /** Dias da semana (0 = domingo ... 6 = sábado), só usado quando unidade === "SEMANA" */
  diasSemana?: number[];
  termino: TerminoRecorrencia;
  terminoData?: Date;
  terminoOcorrencias?: number;
};

// Uma série "sem fim" (NUNCA) não pode gerar linhas indefinidamente, então
// aplicamos um teto: o que vier primeiro entre esses dois limites.
export const LIMITE_OCORRENCIAS = 200;
export const LIMITE_DIAS_HORIZONTE = 730;

export function gerarOcorrencias(
  dataInicioBase: Date,
  regra: RegraRecorrencia,
): Date[] {
  const intervalo = Math.max(1, Math.floor(regra.intervalo));
  const maxOcorrencias =
    regra.termino === "APOS_N" && regra.terminoOcorrencias
      ? Math.min(Math.max(1, regra.terminoOcorrencias), LIMITE_OCORRENCIAS)
      : LIMITE_OCORRENCIAS;
  const dataLimite =
    regra.termino === "EM_DATA" && regra.terminoData
      ? regra.terminoData
      : addDays(dataInicioBase, LIMITE_DIAS_HORIZONTE);

  const ocorrencias: Date[] = [];

  if (regra.unidade === "SEMANA") {
    const diasSemana =
      regra.diasSemana && regra.diasSemana.length > 0
        ? regra.diasSemana
        : [dataInicioBase.getDay()];

    for (
      let dayOffset = 0;
      dayOffset <= LIMITE_DIAS_HORIZONTE + 7 && ocorrencias.length < maxOcorrencias;
      dayOffset++
    ) {
      const data = addDays(dataInicioBase, dayOffset);
      if (isAfter(data, dataLimite)) break;

      const semanasDesdeInicio = differenceInCalendarWeeks(data, dataInicioBase, {
        weekStartsOn: 0,
      });
      if (semanasDesdeInicio % intervalo === 0 && diasSemana.includes(data.getDay())) {
        ocorrencias.push(data);
      }
    }
    return ocorrencias;
  }

  const somarIntervalo = {
    DIA: (data: Date, i: number) => addDays(data, i * intervalo),
    MES: (data: Date, i: number) => addMonths(data, i * intervalo),
    ANO: (data: Date, i: number) => addYears(data, i * intervalo),
  }[regra.unidade];

  for (let i = 0; ocorrencias.length < maxOcorrencias; i++) {
    const data = somarIntervalo(dataInicioBase, i);
    if (isAfter(data, dataLimite)) break;
    ocorrencias.push(data);
  }

  return ocorrencias;
}
