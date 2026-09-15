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
import { deleteServico } from "@/actions/servicos";

export function ServicoRowActions({
  id,
  nome,
  agendamentosCount,
}: {
  id: string;
  nome: string;
  agendamentosCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inUse = agendamentosCount > 0;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteServico(id);
        toast.success("Serviço excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o serviço.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/servicos/${id}`}>
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
            Usado por {agendamentosCount} agendamento{agendamentosCount !== 1 ? "s" : ""}.
            Desative o serviço em vez de excluí-lo.
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
              <DialogTitle>Excluir serviço</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação não
                pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                {isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
