/**
 * Helpers puros da grade de atendimento recorrente por plano. A geração de agendamentos
 * em si (com Prisma) fica em `src/actions/grade-recorrente.ts`.
 *
 * A grade guarda um modelo semanal (dia da semana + horário + profissional) por atribuição
 * de plano ATIVA. O gerador materializa `Agendamento`s para a **janela de cobertura do
 * plano** — os meses-calendário a partir de `dataInicio` da atribuição: 1 mês para plano
 * MENSAL, 3 meses para TRIMESTRAL — enchendo cada mês até `atendimentos`. É completado de
 * forma preguiçosa (lazy) ao abrir a agenda / a aba "Agendamentos" do paciente.
 */
import { diaSemanaDeYmd, DIA_SEMANA_INDICE } from "./funcionamento";
import type { DiaSemana } from "@/generated/prisma/enums";

/** Quantos meses-calendário a grade cobre, a partir do mês de `dataInicio`, por periodicidade. */
export const MESES_COBERTURA_GRADE: Record<string, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
};

/**
 * Total de atendimentos que a grade pode materializar num plano: `atendimentos × meses`.
 * `null` (plano sem limite mensal) → `null` (sem teto total). O que não coube num mês
 * transborda para os seguintes até esgotar esse total.
 */
export function orcamentoGrade(
  atendimentos: number | null,
  meses: number,
): number | null {
  return atendimentos == null ? null : atendimentos * meses;
}

/** Buffer padrão (meses) além da cobertura nominal, quando o plano não tem teto total. */
export const BUFFER_PADRAO_MESES = 2;

/**
 * Buffer máximo (meses) quando o plano TEM um teto total (`orcamentoTotal`): a janela de
 * geração precisa ser generosa o bastante pra sempre alcançar o total contratado, mesmo com
 * uma grade "rala" (poucos dias/semana) que demore vários meses a mais que o período nominal
 * do plano — nunca deixar atendimento sem ser gerado só porque a janela acabou primeiro. O
 * corte de verdade é sempre `usadosTotal >= orcamentoTotal`, não a janela.
 */
export const BUFFER_MAXIMO_MESES = 24;

/**
 * Quantos meses de buffer usar além da cobertura nominal do plano, ao montar a janela de
 * geração da grade (`janelaCoberturaGrade`). Planos com teto total (`orcamentoTotal` não
 * nulo) ganham um buffer bem maior, pra perseguir o total mesmo com grade rala; planos sem
 * teto (sem "total" a perseguir) usam só o buffer padrão, pro transbordo normal de virada
 * de mês.
 */
export function bufferMesesGrade(orcamentoTotal: number | null): number {
  return orcamentoTotal != null ? BUFFER_MAXIMO_MESES : BUFFER_PADRAO_MESES;
}

/** "YYYY-MM-DD" + N dias, sem depender do fuso do processo. */
export function somarDiasYmd(ymd: string, dias: number): string {
  const base = new Date(`${ymd}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/**
 * Janela de cobertura da grade: `meses` meses-calendário a partir do mês de `dataInicioYmd`.
 * Devolve o primeiro dia do mês inicial e o último dia do mês final.
 */
export function janelaCoberturaGrade(
  dataInicioYmd: string,
  meses: number,
): { de: string; ate: string } {
  const [ano, mes] = dataInicioYmd.split("-").map(Number);
  const de = `${dataInicioYmd.slice(0, 7)}-01`;
  const ate = new Date(Date.UTC(ano, mes - 1 + meses, 0)).toISOString().slice(0, 10);
  return { de, ate };
}

/**
 * Todas as datas "YYYY-MM-DD" entre `deYmd` e `ateYmd` (inclusive) cujo dia da semana
 * é `diaSemana`, em ordem cronológica.
 */
export function datasDoDiaSemana(
  diaSemana: DiaSemana,
  deYmd: string,
  ateYmd: string,
): string[] {
  const alvo = DIA_SEMANA_INDICE[diaSemana];
  const datas: string[] = [];
  let atual = deYmd;
  // avança até o primeiro dia da semana alvo
  while (atual <= ateYmd && diaSemanaDeYmd(atual) !== alvo) {
    atual = somarDiasYmd(atual, 1);
  }
  while (atual <= ateYmd) {
    datas.push(atual);
    atual = somarDiasYmd(atual, 7);
  }
  return datas;
}

export type PrevisaoGradeLinha = { diaSemana: DiaSemana };

export type PrevisaoGrade = {
  /** Quantos atendimentos essa grade geraria a partir de agora (fora os já contabilizados). */
  gerados: number;
  /** Data ("YYYY-MM-DD") do último atendimento gerado, ou `null` se nenhum. */
  ultimaData: string | null;
  /** `true` se o total do plano (`orcamentoTotal`) seria esgotado — ou se o plano não tem teto. */
  completo: boolean;
};

/**
 * Prévia PURA (sem I/O) de quantos atendimentos uma grade proposta geraria, sem checar
 * conflito de profissional/sala — só dia da semana × janela × limite mensal × total. Serve
 * pra dar feedback imediato no editor da grade ("essa grade preenche N de TOTAL"), antes de
 * salvar; a checagem fina (conflito, capacidade da sala) só acontece de fato ao salvar
 * (`aplicarGradeRecorrente`/`materializarGradeRecorrente`), então o número real pode ser
 * um pouco menor quando há concorrência por sala/profissional.
 */
export function preverGrade(params: {
  linhas: PrevisaoGradeLinha[];
  deYmd: string;
  fimYmd: string;
  /** Limite de atendimentos por mês-calendário (`atribuicao.atendimentos`); `null` = sem limite. */
  atendimentosMes: number | null;
  /** Teto total do período (`orcamentoGrade`); `null` = sem teto. */
  orcamentoTotal: number | null;
  /** Atendimentos já contados fora desta prévia (ex. já realizados, fora da grade). */
  usadosTotalBase: number;
  /** Atendimentos já contados por mês ("YYYY-MM" → quantidade), mesma base acima. */
  usadosNoMesBase: Record<string, number>;
  /** `true` quando a data está fechada (feriado ou dia da semana sem expediente). */
  diaFechado: (ymd: string) => boolean;
}): PrevisaoGrade {
  const slots = params.linhas
    .flatMap((l) => datasDoDiaSemana(l.diaSemana, params.deYmd, params.fimYmd))
    .sort();

  const usadosNoMes = new Map(Object.entries(params.usadosNoMesBase));
  let usadosTotal = params.usadosTotalBase;
  let gerados = 0;
  let ultimaData: string | null = null;

  for (const ymd of slots) {
    if (params.orcamentoTotal != null && usadosTotal >= params.orcamentoTotal) break;
    if (params.diaFechado(ymd)) continue;

    const ym = ymd.slice(0, 7);
    const usadosMes = usadosNoMes.get(ym) ?? 0;
    if (params.atendimentosMes != null && usadosMes >= params.atendimentosMes) continue;

    usadosNoMes.set(ym, usadosMes + 1);
    usadosTotal += 1;
    gerados += 1;
    ultimaData = ymd;
  }

  return {
    gerados,
    ultimaData,
    completo: params.orcamentoTotal == null || usadosTotal >= params.orcamentoTotal,
  };
}
