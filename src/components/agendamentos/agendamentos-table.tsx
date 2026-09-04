import { listAgendamentos } from "@/actions/agendamentos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgendamentoRowActions } from "@/components/agendamentos/agendamento-row-actions";
import {
  STATUS_AGENDAMENTO_LABEL,
  MODALIDADE_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";

function Participantes({
  pacientes,
}: {
  pacientes: { id: string; nome: string }[];
}) {
  if (pacientes.length === 0) {
    return <span className="text-muted-foreground">Sem paciente</span>;
  }
  if (pacientes.length === 1) return <span>{pacientes[0].nome}</span>;
  return (
    <span>
      {pacientes[0].nome} +{pacientes.length - 1}
    </span>
  );
}

export async function AgendamentosTable({
  page,
  pacienteIds,
  modalidades,
  status,
  de,
  ate,
}: {
  page: number;
  pacienteIds: string[];
  modalidades: string[];
  status: string[];
  de?: string;
  ate?: string;
}) {
  const { agendamentos, total, totalPages } = await listAgendamentos(
    { pacienteIds, modalidades, status, de, ate },
    page,
  );

  if (agendamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} evento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {agendamentos.map((agendamento) => (
          <Card key={agendamento.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{agendamento.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    <Participantes pacientes={agendamento.pacientes} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(agendamento.dataInicio)} ·{" "}
                    {MODALIDADE_AGENDAMENTO_LABEL[agendamento.modalidade]}
                  </p>
                </div>
                <AgendamentoRowActions
                  id={agendamento.id}
                  serieId={agendamento.serieId}
                  remarcar={{
                    titulo: agendamento.titulo,
                    modalidade: agendamento.modalidade,
                    profissionalId: agendamento.profissionalId,
                    dataInicio: agendamento.dataInicio,
                    dataFim: agendamento.dataFim,
                  }}
                />
              </div>
              <Badge
                variant="outline"
                className={cn("w-fit", STATUS_AGENDAMENTO_LABEL[agendamento.status].className)}
              >
                {STATUS_AGENDAMENTO_LABEL[agendamento.status].label}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead>Data e horário</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[200px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendamentos.map((agendamento) => (
              <TableRow key={agendamento.id}>
                <TableCell className="font-medium">{agendamento.titulo}</TableCell>
                <TableCell className="text-muted-foreground">
                  <Participantes pacientes={agendamento.pacientes} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatarDataHora(agendamento.dataInicio)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {MODALIDADE_AGENDAMENTO_LABEL[agendamento.modalidade]}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_AGENDAMENTO_LABEL[agendamento.status].className}
                  >
                    {STATUS_AGENDAMENTO_LABEL[agendamento.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AgendamentoRowActions
                  id={agendamento.id}
                  serieId={agendamento.serieId}
                  remarcar={{
                    titulo: agendamento.titulo,
                    modalidade: agendamento.modalidade,
                    profissionalId: agendamento.profissionalId,
                    dataInicio: agendamento.dataInicio,
                    dataFim: agendamento.dataFim,
                  }}
                />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
