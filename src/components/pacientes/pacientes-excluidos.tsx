import { listPacientes } from "@/actions/pacientes";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { RestaurarPacienteButton } from "@/components/pacientes/restaurar-paciente-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarData } from "@/lib/format";

export async function PacientesExcluidos({ page, search }: { page: number; search: string }) {
  const { pacientes, total, totalPages } = await listPacientes(
    { q: search, excluidos: true },
    page,
  );

  if (pacientes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum paciente excluído encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} paciente{total !== 1 ? "s" : ""} excluído{total !== 1 ? "s" : ""}. Os dados
        continuam guardados.
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {pacientes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{p.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Excluído em {formatarData(p.excluidoEm!)}
                </p>
              </div>
              <RestaurarPacienteButton id={p.id} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Excluído em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientes.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.cpf || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatarData(p.excluidoEm!)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RestaurarPacienteButton id={p.id} />
                  </div>
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
