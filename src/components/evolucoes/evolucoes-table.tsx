import Link from "next/link";
import { listEvolucoes } from "@/actions/evolucoes";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EvolucaoRowActions } from "@/components/evolucoes/evolucao-row-actions";
import { PaginationControls } from "@/components/filters/pagination-controls";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export async function EvolucoesTable({
  page,
  pacienteIds,
  profissionalIds,
  de,
  ate,
}: {
  page: number;
  pacienteIds: string[];
  profissionalIds: string[];
  de?: string;
  ate?: string;
}) {
  const { evolucoes, total, totalPages } = await listEvolucoes(
    { pacienteIds, profissionalIds, de, ate },
    page,
  );

  if (evolucoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma evolução encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} evolução{total !== 1 ? "ões" : ""} encontrada
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {evolucoes.map((evolucao) => (
          <Card key={evolucao.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/pacientes/${evolucao.pacienteId}`}
                    className="font-medium hover:underline"
                  >
                    {evolucao.paciente.nome}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(evolucao.data)} · {evolucao.profissional.name}
                  </p>
                </div>
                <EvolucaoRowActions
                  id={evolucao.id}
                  pacienteId={evolucao.pacienteId}
                />
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
              <TableHead>Paciente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evolucoes.map((evolucao) => (
              <TableRow key={evolucao.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/pacientes/${evolucao.pacienteId}`}
                    className="hover:underline"
                  >
                    {evolucao.paciente.nome}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatarData(evolucao.data)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {evolucao.profissional.name}
                </TableCell>
                <TableCell>
                  <EvolucaoRowActions
                    id={evolucao.id}
                    pacienteId={evolucao.pacienteId}
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
