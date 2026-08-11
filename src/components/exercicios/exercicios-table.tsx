import { listExercicios } from "@/actions/exercicios";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExercicioTableRow,
  ExercicioCard,
} from "@/components/exercicios/exercicio-list-item";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function ExerciciosTable({
  page,
  search,
  categoriaIds,
}: {
  page: number;
  search: string;
  categoriaIds: string[];
}) {
  const { exercicios, total, totalPages } = await listExercicios(
    { q: search, categoriaIds },
    page,
  );

  if (exercicios.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum exercício encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} exercício{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {exercicios.map((exercicio) => (
          <ExercicioCard
            key={exercicio.id}
            id={exercicio.id}
            name={exercicio.name}
            categorias={exercicio.categorias}
            linksCount={exercicio._count.links}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercicios.map((exercicio) => (
              <ExercicioTableRow
                key={exercicio.id}
                id={exercicio.id}
                name={exercicio.name}
                categorias={exercicio.categorias}
                linksCount={exercicio._count.links}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
