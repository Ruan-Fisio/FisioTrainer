"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
import { deletePlano } from "@/actions/planos";

export function PlanoRowActions({
  id,
  nome,
  atribuicoesCount,
}: {
  id: string;
  nome: string;
  atribuicoesCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inUse = atribuicoesCount > 0;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deletePlano(id);
        toast.success("Plano excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o plano.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/planos/${id}`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>

      {inUse ? (
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
            Usado por {atribuicoesCount} paciente
            {atribuicoesCount !== 1 ? "s" : ""}. Cancele as atribuições antes de
            excluir.
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
              <DialogTitle>Excluir plano</DialogTitle>
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
