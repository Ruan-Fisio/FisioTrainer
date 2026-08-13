"use client";

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { ClienteRowActions } from "@/components/clientes/cliente-row-actions";

type ClienteListItemProps = {
  id: string;
  nome: string;
  idade: number | null;
  contato: string | null;
  execucoesCount: number;
};

export function ClienteTableRow({
  id,
  nome,
  idade,
  contato,
  execucoesCount,
}: ClienteListItemProps) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/clientes/${id}`)}
    >
      <TableCell className="font-medium">{nome}</TableCell>
      <TableCell className="text-muted-foreground">{idade ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {contato || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <ClipboardList className="size-3.5" />
          {execucoesCount}
        </div>
      </TableCell>
      <TableCell>
        <ClienteRowActions id={id} nome={nome} />
      </TableCell>
    </TableRow>
  );
}

export function ClienteCard({
  id,
  nome,
  idade,
  contato,
  execucoesCount,
}: ClienteListItemProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer"
      onClick={() => router.push(`/clientes/${id}`)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{nome}</p>
          <ClienteRowActions id={id} nome={nome} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {idade != null && <span>{idade} anos</span>}
          {contato && <span>{contato}</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ClipboardList className="size-3.5" />
          {execucoesCount === 1
            ? "1 registro de exame"
            : `${execucoesCount} registros de exame`}
        </div>
      </CardContent>
    </Card>
  );
}
