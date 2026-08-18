"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Ban } from "lucide-react";
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
import { cancelarPlanoAtribuicao } from "@/actions/plano-atribuicoes";

export function PlanoAtribuicaoRowActions({
  id,
  pacienteId,
}: {
  id: string;
  pacienteId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCancelar() {
    startTransition(async () => {
      try {
        await cancelarPlanoAtribuicao(id, pacienteId);
        toast.success("Plano cancelado. Cobranças pendentes foram removidas.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível cancelar o plano.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/planos/${id}/editar`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Ban className="size-4 text-destructive" />
            <span className="sr-only">Cancelar plano</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar plano</DialogTitle>
            <DialogDescription>
              Isso vai remover todas as cobranças pendentes geradas por este
              plano. Cobranças já pagas permanecem no histórico do paciente.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={isPending}
            >
              {isPending ? "Cancelando..." : "Cancelar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
