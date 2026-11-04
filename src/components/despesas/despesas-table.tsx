import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { DespesaRowActions } from "@/components/despesas/despesa-row-actions";
import { listDespesas } from "@/actions/despesas";
import {
  despesaAtrasada,
  LABEL_CATEGORIA_DESPESA,
  type FiltrosDespesas,
  type StatusDespesa,
} from "@/lib/despesas";
import { formatarData, formatarMoeda } from "@/lib/format";

function StatusBadge({ despesa }: { despesa: { status: StatusDespesa; data: Date; pagoEm: Date | null } }) {
  if (despesa.status === "PAGO") {
    return (
      <Badge variant="secondary">
        Paga{despesa.pagoEm ? ` em ${formatarData(despesa.pagoEm)}` : ""}
      </Badge>
    );
  }
  return despesaAtrasada(despesa) ? (
    <Badge variant="destructive">Em atraso</Badge>
  ) : (
    <Badge variant="outline">A pagar</Badge>
  );
}

export async function DespesasTable({ filtros, page }: { filtros: FiltrosDespesas; page: number }) {
  const { despesas, totalPaginas } = await listDespesas(filtros, page);

  if (despesas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma despesa encontrada neste mês.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {despesas.map((despesa) => (
          <Card key={despesa.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{despesa.descricao}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatarMoeda(despesa.valor)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {LABEL_CATEGORIA_DESPESA[despesa.categoria]} · {formatarData(despesa.data)}
                {despesa.fornecedor ? ` · ${despesa.fornecedor}` : ""}
              </p>
              {despesa.numeroDocumento && (
                <p className="text-xs text-muted-foreground">Doc. {despesa.numeroDocumento}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <StatusBadge despesa={despesa} />
                <DespesaRowActions id={despesa.id} pago={despesa.status === "PAGO"} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[130px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.map((despesa) => (
              <TableRow key={despesa.id}>
                <TableCell>
                  <div className="font-medium">{despesa.descricao}</div>
                  {(despesa.fornecedor || despesa.numeroDocumento) && (
                    <div className="text-xs text-muted-foreground">
                      {[despesa.fornecedor, despesa.numeroDocumento && `Doc. ${despesa.numeroDocumento}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {LABEL_CATEGORIA_DESPESA[despesa.categoria]}
                </TableCell>
                <TableCell>{formatarData(despesa.data)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatarMoeda(despesa.valor)}
                </TableCell>
                <TableCell>
                  <StatusBadge despesa={despesa} />
                </TableCell>
                <TableCell>
                  <DespesaRowActions id={despesa.id} pago={despesa.status === "PAGO"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPaginas} />
    </div>
  );
}
