import Link from "next/link";
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
import { CobrancaRowActions } from "@/components/cobrancas/cobranca-row-actions";
import { statusCobranca } from "@/components/cobrancas/paciente-cobrancas-list";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { listCobrancasPendentes } from "@/actions/cobrancas";

type Cobranca = Awaited<ReturnType<typeof listCobrancasPendentes>>[number];

export function CobrancasList({ cobrancas }: { cobrancas: Cobranca[] }) {
  if (cobrancas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma cobrança pendente no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {cobrancas.length} cobrança{cobrancas.length !== 1 ? "s" : ""} pendente
        {cobrancas.length !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {cobrancas.map((cobranca) => {
          const status = statusCobranca(cobranca);
          return (
            <Card key={cobranca.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/pacientes/${cobranca.paciente.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {cobranca.paciente.nome}
                  </Link>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cobranca.planoNome} · {formatarMoeda(cobranca.valor)}
                  {cobranca.numeroParcela && cobranca.totalParcelas
                    ? ` · Parcela ${cobranca.numeroParcela}/${cobranca.totalParcelas}`
                    : ""}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatarData(cobranca.vencimento)}
                  </p>
                  <CobrancaRowActions
                    id={cobranca.id}
                    pacienteId={cobranca.pacienteId}
                    pago={false}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cobrancas.map((cobranca) => {
              const status = statusCobranca(cobranca);
              return (
                <TableRow key={cobranca.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/pacientes/${cobranca.paciente.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {cobranca.paciente.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cobranca.planoNome}
                    {cobranca.numeroParcela && cobranca.totalParcelas
                      ? ` · Parcela ${cobranca.numeroParcela}/${cobranca.totalParcelas}`
                      : ""}
                  </TableCell>
                  <TableCell>{formatarMoeda(cobranca.valor)}</TableCell>
                  <TableCell>{formatarData(cobranca.vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <CobrancaRowActions
                      id={cobranca.id}
                      pacienteId={cobranca.pacienteId}
                      pago={false}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
