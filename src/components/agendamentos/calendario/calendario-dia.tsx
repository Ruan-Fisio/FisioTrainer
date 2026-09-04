import { GradeHoraria } from "@/components/agendamentos/calendario/grade-horaria";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

export function CalendarioDia({
  dataReferencia,
  eventos,
}: {
  dataReferencia: Date;
  eventos: EventoCalendario[];
}) {
  return <GradeHoraria dias={[dataReferencia]} eventos={eventos} />;
}
