import { listPlanos } from "@/actions/planos";
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
import { PlanoRowActions } from "@/components/planos/plano-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { tipoPlanoLabels } from "@/lib/validations/plano";
import { formatarMoeda } from "@/lib/format";

export async function PlanosTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { planos, total, totalPages } = await listPlanos({ q: search }, page);

  if (planos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum plano encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} plano{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {planos.map((plano) => (
          <Card key={plano.id}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{plano.nome}</p>
                  {plano.tipos.map((t) => (
                    <Badge key={t} variant="secondary">
                      {tipoPlanoLabels[t]}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plano.atendimentos}x atendimentos
                </p>
                <p className="text-xs text-muted-foreground">
                  À vista: {formatarMoeda(plano.valorAVistaMensal)}/mês ·{" "}
                  {formatarMoeda(plano.valorAVistaTrimestral)}/trimestre
                </p>
              </div>
              <PlanoRowActions
                id={plano.id}
                nome={plano.nome}
                atribuicoesCount={plano._count.atribuicoes}
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
              <TableHead>Tipo</TableHead>
              <TableHead>Atendimentos</TableHead>
              <TableHead>À vista (mensal / trimestral)</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((plano) => (
              <TableRow key={plano.id}>
                <TableCell className="font-medium">{plano.nome}</TableCell>
                <TableCell>
                  {plano.tipos.map((t) => (
                    <Badge key={t} variant="secondary">
                      {tipoPlanoLabels[t]}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {plano.atendimentos}x
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatarMoeda(plano.valorAVistaMensal)} /{" "}
                  {formatarMoeda(plano.valorAVistaTrimestral)}
                </TableCell>
                <TableCell>
                  <PlanoRowActions
                    id={plano.id}
                    nome={plano.nome}
                    atribuicoesCount={plano._count.atribuicoes}
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
