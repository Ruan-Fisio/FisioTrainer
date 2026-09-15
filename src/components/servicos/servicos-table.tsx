import { listServicos } from "@/actions/servicos";
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
import { ServicoRowActions } from "@/components/servicos/servico-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function ServicosTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { servicos, total, totalPages } = await listServicos({ q: search }, page);

  if (servicos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum serviço encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} serviço{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {servicos.map((servico) => (
          <Card key={servico.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{servico.nome}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant={servico.ativo ? "secondary" : "outline"}>
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="secondary">
                    {servico.salas.length} sala{servico.salas.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary">
                    {servico.profissionais.length} profissional
                    {servico.profissionais.length !== 1 ? "is" : ""}
                  </Badge>
                </div>
              </div>
              <ServicoRowActions
                id={servico.id}
                nome={servico.nome}
                agendamentosCount={servico._count.agendamentos}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Salas</TableHead>
              <TableHead>Profissionais</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicos.map((servico) => (
              <TableRow key={servico.id}>
                <TableCell className="font-medium">{servico.nome}</TableCell>
                <TableCell>
                  <Badge variant={servico.ativo ? "secondary" : "outline"}>
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>{servico.salas.length}</TableCell>
                <TableCell>{servico.profissionais.length}</TableCell>
                <TableCell>
                  <ServicoRowActions
                    id={servico.id}
                    nome={servico.nome}
                    agendamentosCount={servico._count.agendamentos}
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
