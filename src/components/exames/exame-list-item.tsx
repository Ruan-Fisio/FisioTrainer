"use client";

import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExameRowActions } from "@/components/exames/exame-row-actions";

const TIPO_EXAME_LABELS: Record<"FISIOTERAPIA" | "EDUCACAO_FISICA", string> = {
  FISIOTERAPIA: "Fisioterapia",
  EDUCACAO_FISICA: "Educação Física",
};

type ExameListItemProps = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "FISIOTERAPIA" | "EDUCACAO_FISICA";
  secoesCount: number;
};

export function ExameTableRow({
  id,
  nome,
  descricao,
  tipo,
  secoesCount,
}: ExameListItemProps) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/exames/${id}`)}
    >
      <TableCell className="font-medium">{nome}</TableCell>
      <TableCell className="text-muted-foreground">
        {descricao || "—"}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{TIPO_EXAME_LABELS[tipo]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <ListChecks className="size-3.5" />
          {secoesCount}
        </div>
      </TableCell>
      <TableCell>
        <ExameRowActions id={id} nome={nome} />
      </TableCell>
    </TableRow>
  );
}

export function ExameCard({
  id,
  nome,
  descricao,
  tipo,
  secoesCount,
}: ExameListItemProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer"
      onClick={() => router.push(`/exames/${id}`)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{nome}</p>
          <ExameRowActions id={id} nome={nome} />
        </div>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{TIPO_EXAME_LABELS[tipo]}</Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ListChecks className="size-3.5" />
            {secoesCount === 1 ? "1 seção" : `${secoesCount} seções`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
