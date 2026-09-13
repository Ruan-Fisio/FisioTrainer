import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { formatarData, toDateInputValue } from "@/lib/format";
import { DIA_SEMANA_INDICE, diaSemanaDeYmd } from "@/lib/funcionamento";

/**
 * Configuração de funcionamento da clínica (aba "Funcionamento" de /configuracoes):
 * quais dias da semana ela atende e quais datas são feriado. Bloqueiam agendamento.
 *
 * - `diasAbertos`: set de índices de dia da semana (0 = domingo) em que a clínica atende.
 *   Sem nenhuma linha `DiaFuncionamento` (banco novo / seed pendente) assume todos abertos,
 *   então a agenda nunca trava sozinha.
 * - `feriados`: mapa "YYYY-MM-DD" → descrição.
 *
 * `cache()` dedupe por request. Nunca importar em client component (usa Prisma).
 */
export const getConfigFuncionamento = cache(async () => {
  const [dias, feriados] = await Promise.all([
    prisma.diaFuncionamento.findMany(),
    prisma.feriado.findMany({ orderBy: { data: "asc" } }),
  ]);

  const diasAbertos = new Set<number>(
    dias.length === 0
      ? [0, 1, 2, 3, 4, 5, 6]
      : dias.filter((d) => d.aberto).map((d) => DIA_SEMANA_INDICE[d.diaSemana]),
  );

  const feriadosMap = new Map<string, string>(
    feriados.map((f) => [f.data.toISOString().slice(0, 10), f.descricao]),
  );

  return { diasAbertos, feriados: feriadosMap };
});

/**
 * Valida se a clínica atende no dia do instante informado (fuso de Brasília).
 * Retorna a mensagem de erro, ou `null` se pode agendar.
 */
export async function validarFuncionamento(dataInicio: Date): Promise<string | null> {
  const { diasAbertos, feriados } = await getConfigFuncionamento();
  const ymd = toDateInputValue(dataInicio);

  const feriado = feriados.get(ymd);
  if (feriado) {
    return `A clínica não atende em ${formatarData(dataInicio)} — ${feriado}.`;
  }
  if (!diasAbertos.has(diaSemanaDeYmd(ymd))) {
    return "A clínica não atende neste dia da semana. Ajuste os dias de funcionamento em Configurações.";
  }
  return null;
}
