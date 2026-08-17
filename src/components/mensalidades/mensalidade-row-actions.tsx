"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Pencil, Trash2 } from "lucide-react";
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
  deleteMensalidade,
  marcarMensalidadePaga,
} from "@/actions/mensalidades";

export function MensalidadeRowActions({
  id,
  pacienteId,
  pago,
}: {
  id: string;
  pacienteId: string;
  pago: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteMensalidade(id, pacienteId);
        toast.success("Mensalidade excluída com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir a mensalidade.");
      }
    });
  }

  function handlePagar() {
    startTransition(async () => {
      try {
        await marcarMensalidadePaga(id, pacienteId);
        toast.success("Mensalidade marcada como paga.");
      } catch {
        toast.error("Não foi possível atualizar a mensalidade.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!pago && (
        <Button
          variant="outline"
          size="icon"
          onClick={handlePagar}
          disabled={isPending}
          title="Marcar como paga"
        >
          <Check className="size-4 text-emerald-600" />
          <span className="sr-only">Marcar como paga</span>
        </Button>
      )}
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/mensalidades/${id}/editar`}>
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
            <DialogTitle>Excluir mensalidade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta mensalidade? Esta ação não
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
