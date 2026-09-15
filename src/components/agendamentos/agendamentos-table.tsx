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
import {
  STATUS_AGENDAMENTO_LABEL,
  modalidadeAgendamentoLabel,
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
  profissionalIds,
  modalidades,
  status,
  de,
  ate,
}: {
  page: number;
  pacienteIds: string[];
  profissionalIds: string[];
  modalidades: string[];
  status: string[];
  de?: string;
  ate?: string;
}) {
  const { agendamentos, total, totalPages } = await listAgendamentos(
    { pacienteIds, profissionalIds, modalidades, status, de, ate },
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
              <div>
                <p className="font-medium">{agendamento.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  <Participantes pacientes={agendamento.pacientes} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatarDataHora(agendamento.dataInicio)} ·{" "}
                  {modalidadeAgendamentoLabel(agendamento.modalidade, agendamento.servico?.nome)}
                  {agendamento.sala ? ` · ${agendamento.sala.nome}` : ""}
                </p>
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
              <TableHead>Sala</TableHead>
              <TableHead>Status</TableHead>
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
                  {modalidadeAgendamentoLabel(agendamento.modalidade, agendamento.servico?.nome)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {agendamento.sala?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_AGENDAMENTO_LABEL[agendamento.status].className}
                  >
                    {STATUS_AGENDAMENTO_LABEL[agendamento.status].label}
                  </Badge>
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
