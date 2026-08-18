"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteExame } from "@/actions/exames";

export function ExameRowActions({
  id,
  nome,
  execucoesCount,
}: {
  id: string;
  nome: string;
  execucoesCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const emUso = execucoesCount > 0;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteExame(id);
        toast.success("Exame excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o exame.");
      }
    });
  }

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <Button variant="outline" size="icon" asChild>
        <Link href={`/exames/${id}`}>
          <Eye className="size-4" />
          <span className="sr-only">Visualizar</span>
        </Link>
      </Button>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/exames/${id}/editar`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
      {emUso ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="icon" disabled>
                <Trash2 className="size-4 text-muted-foreground" />
                <span className="sr-only">Excluir</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Usado por {execucoesCount} avaliação
            {execucoesCount !== 1 ? "ões" : ""}. Não pode ser excluído.
          </TooltipContent>
        </Tooltip>
      ) : (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Trash2 className="size-4 text-destructive" />
            <span className="sr-only">Excluir</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir exame</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{nome}</strong>? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
