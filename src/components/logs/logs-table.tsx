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
import { PaginationControls } from "@/components/filters/pagination-controls";
import { LogDetalhesDialog } from "@/components/logs/log-detalhes-dialog";
import { acaoLabel, moduloLabel } from "@/lib/audit";
import { listLogs, type LogFilters } from "@/actions/logs";

function acaoClasse(acao: string) {
  if (acao.startsWith("create")) {
    return "border-transparent bg-green-600/10 text-green-700 dark:text-green-400";
  }
  if (acao.startsWith("delete")) {
    return "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20";
  }
  return "border-transparent bg-primary/10 text-primary";
}

function formatarQuando(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(data);
}

export async function LogsTable({
  filters,
  page,
}: {
  filters: LogFilters;
  page: number;
}) {
  const { logs, total, totalPages } = await listLogs(filters, page);

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma operação registrada com esses filtros.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} registro{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{moduloLabel(log.modulo)}</Badge>
                <Badge variant="outline" className={acaoClasse(log.acao)}>
                  {acaoLabel(log.acao)}
                </Badge>
              </div>
              <p className="text-sm font-medium">{log.resumo}</p>
              <p className="text-xs text-muted-foreground">
                {formatarQuando(log.criadoEm)} · {log.usuarioNome ?? "Sistema"}
              </p>
              <div className="pt-1">
                <LogDetalhesDialog
                  resumo={log.resumo}
                  quando={formatarQuando(log.criadoEm)}
                  usuario={log.usuarioNome ?? "Sistema"}
                  registroId={log.registroId}
                  dados={log.dados}
                />
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
              <TableHead className="w-[170px]">Quando</TableHead>
              <TableHead className="w-[150px]">Usuário</TableHead>
              <TableHead className="w-[160px]">Módulo</TableHead>
              <TableHead className="w-[130px]">Ação</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead className="w-[100px] text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {formatarQuando(log.criadoEm)}
                </TableCell>
                <TableCell className="text-sm">{log.usuarioNome ?? "Sistema"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{moduloLabel(log.modulo)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={acaoClasse(log.acao)}>
                    {acaoLabel(log.acao)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.resumo}</TableCell>
                <TableCell className="text-right">
                  <LogDetalhesDialog
                    resumo={log.resumo}
                    quando={formatarQuando(log.criadoEm)}
                    usuario={log.usuarioNome ?? "Sistema"}
                    registroId={log.registroId}
                    dados={log.dados}
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
