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
import { deleteEvolucao } from "@/actions/evolucoes";

export function EvolucaoRowActions({
  id,
  pacienteId,
}: {
  id: string;
  pacienteId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteEvolucao(id, pacienteId);
        toast.success("Evolução excluída com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir a evolução.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/evolucoes/${id}`}>
          <Eye className="size-4" />
          <span className="sr-only">Visualizar</span>
        </Link>
      </Button>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/evolucoes/${id}/editar`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Trash2 className="size-4 text-destructive" />
            <span className="sr-only">Excluir</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir evolução</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta evolução? Esta ação não
              pode ser desfeita.
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
    </div>
  );
}
