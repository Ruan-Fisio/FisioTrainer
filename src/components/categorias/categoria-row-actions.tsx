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
import { deleteCategoria } from "@/actions/categorias";

export function CategoriaRowActions({
  id,
  name,
  exerciciosCount,
}: {
  id: string;
  name: string;
  exerciciosCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inUse = exerciciosCount > 0;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCategoria(id);
        toast.success("Categoria excluída com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir a categoria.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/biblioteca/categorias/${id}`}>
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
            Usada por {exerciciosCount} exercício
            {exerciciosCount !== 1 ? "s" : ""}. Remova a associação antes de
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
              <DialogTitle>Excluir categoria</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir <strong>{name}</strong>? Esta
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
