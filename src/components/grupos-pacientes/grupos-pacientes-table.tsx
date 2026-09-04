import { listGruposPacientes } from "@/actions/grupos-pacientes";
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
import { GrupoPacienteRowActions } from "@/components/grupos-pacientes/grupo-paciente-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function GruposPacientesTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { grupos, total, totalPages } = await listGruposPacientes({ q: search }, page);

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum grupo encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} grupo{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {grupos.map((grupo) => (
          <Card key={grupo.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{grupo.nome}</p>
                <Badge variant="secondary" className="mt-1">
                  {grupo.pacientes.length} paciente
                  {grupo.pacientes.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <GrupoPacienteRowActions id={grupo.id} nome={grupo.nome} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Pacientes</TableHead>
              <TableHead className="w-[110px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((grupo) => (
              <TableRow key={grupo.id}>
                <TableCell className="font-medium">{grupo.nome}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {grupo.pacientes.length} paciente
                    {grupo.pacientes.length !== 1 ? "s" : ""}
                  </Badge>
                </TableCell>
                <TableCell>
                  <GrupoPacienteRowActions id={grupo.id} nome={grupo.nome} />
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
