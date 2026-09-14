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
 *
 * `bloqueadas` são salas que já têm agendamento de OUTRA modalidade nesse horário —
 * uma sala nunca atende Fisioterapia e Educação Física ao mesmo tempo: a partir do
 * momento que tem 1 agendamento de uma modalidade num horário, a sala fica exclusiva
 * daquela modalidade para o restante da sobreposição, mesmo se ainda houver vaga
 * numérica pra outra modalidade.
 */
export function escolherSalaComVaga(
  candidatas: SalaCandidata[],
  ocupadas: OcupacaoPorSala,
  quantidade: number,
  bloqueadas: ReadonlySet<string> = new Set(),
): SalaCandidata | null {
  const novas = Math.max(quantidade, 1);
  for (const candidata of candidatas) {
    if (bloqueadas.has(candidata.salaId)) continue;
    const ocupada = ocupadas[candidata.salaId] ?? 0;
    if (ocupada + novas <= candidata.capacidade) return candidata;
  }
  return null;
}

/** Soma das vagas livres entre todas as salas candidatas — para exibir disponibilidade. */
export function vagasTotais(
  candidatas: SalaCandidata[],
  ocupadas: OcupacaoPorSala,
  bloqueadas: ReadonlySet<string> = new Set(),
): number {
  return candidatas.reduce((soma, candidata) => {
    if (bloqueadas.has(candidata.salaId)) return soma;
    const ocupada = ocupadas[candidata.salaId] ?? 0;
    return soma + Math.max(candidata.capacidade - ocupada, 0);
  }, 0);
}
