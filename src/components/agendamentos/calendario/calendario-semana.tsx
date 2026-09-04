import { getDiasDaGrade } from "@/lib/calendario";
import { GradeHoraria } from "@/components/agendamentos/calendario/grade-horaria";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

export function CalendarioSemana({
  inicio,
  fim,
  eventos,
}: {
  inicio: Date;
  fim: Date;
  eventos: EventoCalendario[];
}) {
  const dias = getDiasDaGrade(inicio, fim);
  return <GradeHoraria dias={dias} eventos={eventos} />;
}
