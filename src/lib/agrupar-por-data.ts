import { toDateInputValue } from "@/lib/format";

export type GrupoPorDia<T> = {
  /** Dia no fuso da clínica, "YYYY-MM-DD". */
  dia: string;
  itens: T[];
};

/**
 * Agrupa itens pelo dia (fuso de Brasília), do dia mais recente para o mais
 * antigo; dentro do dia, também do mais recente para o mais antigo.
 */
export function agruparPorDia<T>(
  itens: T[],
  obterData: (item: T) => Date,
): GrupoPorDia<T>[] {
  const ordenados = [...itens].sort(
    (a, b) => obterData(b).getTime() - obterData(a).getTime(),
  );
  const grupos: GrupoPorDia<T>[] = [];
  for (const item of ordenados) {
    const dia = toDateInputValue(obterData(item));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.itens.push(item);
    else grupos.push({ dia, itens: [item] });
  }
  return grupos;
}
