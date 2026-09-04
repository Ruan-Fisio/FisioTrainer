/**
 * Regra de negócio: pelo portal público (link de token), o paciente só pode desmarcar
 * um atendimento até N horas antes do início. Fora desse prazo o cancelamento é bloqueado
 * e a ausência conta como falta. O lado da clínica não tem essa limitação.
 */
export const HORAS_ANTECEDENCIA_CANCELAMENTO = 2;

/** O paciente só pode desmarcar até HORAS_ANTECEDENCIA_CANCELAMENTO horas antes do início. */
export function pacientePodeDesmarcar(dataInicio: Date, agora: Date = new Date()): boolean {
  return (
    agora.getTime() <=
    dataInicio.getTime() - HORAS_ANTECEDENCIA_CANCELAMENTO * 60 * 60 * 1000
  );
}
