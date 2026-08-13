import { listMovimentos } from "@/actions/movimentos";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovimentoRowActions } from "@/components/movimentos/movimento-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function MovimentosTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { movimentos, total, totalPages } = await listMovimentos(
    { q: search },
    page,
  );

  if (movimentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum movimento encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} movimento{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {movimentos.map((movimento) => (
          <Card key={movimento.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{movimento.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Grau ideal: {movimento.grauIdeal}
                </p>
              </div>
              <MovimentoRowActions id={movimento.id} nome={movimento.nome} />
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
              <TableHead>Grau ideal</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentos.map((movimento) => (
              <TableRow key={movimento.id}>
                <TableCell className="font-medium">
                  {movimento.nome}
                </TableCell>
                <TableCell>{movimento.grauIdeal}</TableCell>
                <TableCell>
                  <MovimentoRowActions
                    id={movimento.id}
                    nome={movimento.nome}
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
