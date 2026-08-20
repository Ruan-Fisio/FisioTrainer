import { listTreinos } from "@/actions/treinos";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TreinoTableRow, TreinoCard } from "@/components/treinos/treino-list-item";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function TreinosTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { treinos, total, totalPages } = await listTreinos({ q: search }, page);

  if (treinos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum treino encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} treino{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3 md:hidden">
        {treinos.map((treino) => (
          <TreinoCard
            key={treino.id}
            id={treino.id}
            nome={treino.nome}
            descricao={treino.descricao}
            diasCount={treino._count.dias}
            copiasCount={treino._count.copias}
          />
        ))}
      </div>

      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Atribuído a</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treinos.map((treino) => (
              <TreinoTableRow
                key={treino.id}
                id={treino.id}
                nome={treino.nome}
                descricao={treino.descricao}
                diasCount={treino._count.dias}
                copiasCount={treino._count.copias}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
