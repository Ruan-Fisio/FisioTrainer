"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { TreinoRowActions } from "@/components/treinos/treino-row-actions";

type TreinoListItemProps = {
  id: string;
  nome: string;
  descricao: string | null;
  diasCount: number;
  copiasCount: number;
};

export function TreinoTableRow({
  id,
  nome,
  descricao,
  diasCount,
  copiasCount,
}: TreinoListItemProps) {
  const router = useRouter();

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/treinos/${id}`)}>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>{nome}</span>
          {descricao && (
            <span className="text-xs text-muted-foreground">{descricao}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          {diasCount} dia{diasCount !== 1 ? "s" : ""}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <Dumbbell className="size-3.5" />
          {copiasCount} paciente{copiasCount !== 1 ? "s" : ""}
        </div>
      </TableCell>
      <TableCell>
        <TreinoRowActions id={id} nome={nome} />
      </TableCell>
    </TableRow>
  );
}

export function TreinoCard({
  id,
  nome,
  descricao,
  diasCount,
  copiasCount,
}: TreinoListItemProps) {
  const router = useRouter();

  return (
    <Card className="cursor-pointer" onClick={() => router.push(`/treinos/${id}`)}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <p className="font-medium">{nome}</p>
            {descricao && (
              <p className="text-xs text-muted-foreground">{descricao}</p>
            )}
          </div>
          <TreinoRowActions id={id} nome={nome} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {diasCount} dia{diasCount !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="size-3.5" />
            {copiasCount} paciente{copiasCount !== 1 ? "s" : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
