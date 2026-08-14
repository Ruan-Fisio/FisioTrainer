import { listPacientes } from "@/actions/pacientes";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PacienteTableRow,
  PacienteCard,
} from "@/components/pacientes/paciente-list-item";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function PacientesTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { pacientes, total, totalPages } = await listPacientes(
    { q: search },
    page,
  );

  if (pacientes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum paciente encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} paciente{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {pacientes.map((paciente) => (
          <PacienteCard
            key={paciente.id}
            id={paciente.id}
            nome={paciente.nome}
            idade={paciente.idade}
            contato={paciente.contato}
            execucoesCount={paciente._count.execucoes}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Exames</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientes.map((paciente) => (
              <PacienteTableRow
                key={paciente.id}
                id={paciente.id}
                nome={paciente.nome}
                idade={paciente.idade}
                contato={paciente.contato}
                execucoesCount={paciente._count.execucoes}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
