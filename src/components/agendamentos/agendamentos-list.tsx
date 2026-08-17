import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgendamentoRowActions } from "@/components/agendamentos/agendamento-row-actions";
import {
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { formatarDataHora } from "@/lib/format";
import type { getAgendamentosByPaciente } from "@/actions/agendamentos";

type Agendamento = Awaited<
  ReturnType<typeof getAgendamentosByPaciente>
>[number];

export function AgendamentosList({
  agendamentos,
}: {
  agendamentos: Agendamento[];
}) {
  if (agendamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum retorno agendado para este paciente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {agendamentos.map((agendamento) => (
        <Card key={agendamento.id}>
          <CardContent className="flex items-center justify-between gap-2 p-4">
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                {formatarDataHora(agendamento.dataHora)}
              </p>
              <p className="text-xs text-muted-foreground">
                {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]}
                {agendamento.observacao ? ` · ${agendamento.observacao}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={STATUS_AGENDAMENTO_LABEL[agendamento.status].variant}
              >
                {STATUS_AGENDAMENTO_LABEL[agendamento.status].label}
              </Badge>
              <AgendamentoRowActions id={agendamento.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
