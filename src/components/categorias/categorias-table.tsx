import { listCategorias } from "@/actions/categorias";
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
import { CategoriaRowActions } from "@/components/categorias/categoria-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function CategoriasTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { categorias, total, totalPages } = await listCategorias(
    { q: search },
    page,
  );

  if (categorias.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma categoria encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} categoria{total !== 1 ? "s" : ""} encontrada
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {categorias.map((categoria) => (
          <Card key={categoria.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{categoria.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {categoria._count.exercicios} exercício
                  {categoria._count.exercicios !== 1 ? "s" : ""}
                </Badge>
              </div>
              <CategoriaRowActions
                id={categoria.id}
                name={categoria.name}
                exerciciosCount={categoria._count.exercicios}
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
              <TableHead>Uso</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell className="font-medium">
                  {categoria.name}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {categoria._count.exercicios} exercício
                    {categoria._count.exercicios !== 1 ? "s" : ""}
                  </Badge>
                </TableCell>
                <TableCell>
                  <CategoriaRowActions
                    id={categoria.id}
                    name={categoria.name}
                    exerciciosCount={categoria._count.exercicios}
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
