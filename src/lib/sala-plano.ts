/**
 * Lógica pura de escolha de sala pelo plano (Fisioterapia/Educação Física): um Plano lista
 * suas salas candidatas (`PlanoSala`, na ordem de `Sala.ordem`); ao agendar, o sistema tenta
 * cada uma em ordem e usa a primeira com vaga. Sem I/O — a busca das candidatas e da
 * ocupação concorrente é feita por `resolverSalaPlano`/`getSalasCandidatasPlano`
 * (`src/lib/agendamento-checagens.ts`), que chamam estas funções.
 */

export type SalaCandidata = { salaId: string; nome: string; capacidade: number };

/** Pacientes já ocupando cada sala candidata, no horário em questão. */
export type OcupacaoPorSala = Record<string, number>;

/**
 * Primeira sala candidata (na ordem recebida) com vaga suficiente para `quantidade`
 * pacientes novos. `null` se nenhuma tiver vaga (ou não houver candidatas).
 */
export function escolherSalaComVaga(
  candidatas: SalaCandidata[],
  ocupadas: OcupacaoPorSala,
  quantidade: number,
): SalaCandidata | null {
  const novas = Math.max(quantidade, 1);
  for (const candidata of candidatas) {
    const ocupada = ocupadas[candidata.salaId] ?? 0;
    if (ocupada + novas <= candidata.capacidade) return candidata;
  }
  return null;
}

/** Soma das vagas livres entre todas as salas candidatas — para exibir disponibilidade. */
export function vagasTotais(
  candidatas: SalaCandidata[],
  ocupadas: OcupacaoPorSala,
): number {
  return candidatas.reduce((soma, candidata) => {
    const ocupada = ocupadas[candidata.salaId] ?? 0;
    return soma + Math.max(candidata.capacidade - ocupada, 0);
  }, 0);
}
