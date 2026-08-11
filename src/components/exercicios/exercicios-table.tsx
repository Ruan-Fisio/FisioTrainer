import Link from "next/link";
import { Link2 } from "lucide-react";
import { listExercicios } from "@/actions/exercicios";
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
import { ExercicioRowActions } from "@/components/exercicios/exercicio-row-actions";
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
          <Card key={exercicio.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/biblioteca/exercicios/${exercicio.id}`}
                  className="font-medium hover:underline"
                >
                  {exercicio.name}
                </Link>
                <ExercicioRowActions
                  id={exercicio.id}
                  name={exercicio.name}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {exercicio.categorias.map((categoria) => (
                  <Badge key={categoria.id} variant="secondary">
                    {categoria.name}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link2 className="size-3.5" />
                {exercicio._count.links} link
                {exercicio._count.links !== 1 ? "s" : ""}
              </div>
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
              <TableHead>Categorias</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercicios.map((exercicio) => (
              <TableRow key={exercicio.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/biblioteca/exercicios/${exercicio.id}`}
                    className="hover:underline"
                  >
                    {exercicio.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {exercicio.categorias.map((categoria) => (
                      <Badge key={categoria.id} variant="secondary">
                        {categoria.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Link2 className="size-3.5" />
                    {exercicio._count.links}
                  </div>
                </TableCell>
                <TableCell>
                  <ExercicioRowActions
                    id={exercicio.id}
                    name={exercicio.name}
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
