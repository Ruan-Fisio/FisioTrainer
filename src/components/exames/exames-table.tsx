import { listExames } from "@/actions/exames";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExameTableRow, ExameCard } from "@/components/exames/exame-list-item";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function ExamesTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { exames, total, totalPages } = await listExames(
    { q: search },
    page,
  );

  if (exames.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum exame encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} exame{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {exames.map((exame) => (
          <ExameCard
            key={exame.id}
            id={exame.id}
            nome={exame.nome}
            descricao={exame.descricao}
            tipo={exame.tipo}
            secoesCount={exame._count.secoes}
            execucoesCount={exame._count.execucoes}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Seções</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exames.map((exame) => (
              <ExameTableRow
                key={exame.id}
                id={exame.id}
                nome={exame.nome}
                descricao={exame.descricao}
                tipo={exame.tipo}
                secoesCount={exame._count.secoes}
                execucoesCount={exame._count.execucoes}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
