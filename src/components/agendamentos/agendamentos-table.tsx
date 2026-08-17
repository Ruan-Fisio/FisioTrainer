import Link from "next/link";
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
  TIPO_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { formatarDataHora } from "@/lib/format";

export async function AgendamentosTable({
  page,
  pacienteIds,
  tipos,
  status,
  de,
  ate,
}: {
  page: number;
  pacienteIds: string[];
  tipos: string[];
  status: string[];
  de?: string;
  ate?: string;
}) {
  const { agendamentos, total, totalPages } = await listAgendamentos(
    { pacienteIds, tipos, status, de, ate },
    page,
  );

  if (agendamentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum agendamento encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} agendamento{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {agendamentos.map((agendamento) => (
          <Card key={agendamento.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/pacientes/${agendamento.pacienteId}`}
                    className="font-medium hover:underline"
                  >
                    {agendamento.paciente.nome}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(agendamento.dataHora)} ·{" "}
                    {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]}
                  </p>
                </div>
                <AgendamentoRowActions id={agendamento.id} />
              </div>
              <Badge
                className="w-fit"
                variant={STATUS_AGENDAMENTO_LABEL[agendamento.status].variant}
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
              <TableHead>Paciente</TableHead>
              <TableHead>Data e horário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendamentos.map((agendamento) => (
              <TableRow key={agendamento.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/pacientes/${agendamento.pacienteId}`}
                    className="hover:underline"
                  >
                    {agendamento.paciente.nome}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatarDataHora(agendamento.dataHora)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_AGENDAMENTO_LABEL[agendamento.status].variant}
                  >
                    {STATUS_AGENDAMENTO_LABEL[agendamento.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AgendamentoRowActions id={agendamento.id} />
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
