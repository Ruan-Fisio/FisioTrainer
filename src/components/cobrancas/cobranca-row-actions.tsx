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
import { deleteCobranca, marcarCobrancaPaga } from "@/actions/cobrancas";

export function CobrancaRowActions({
  id,
  pacienteId,
  pago,
}: {
  id: string;
  pacienteId: string;
  pago: boolean;
}) {
  const [openExcluir, setOpenExcluir] = useState(false);
  const [openPagar, setOpenPagar] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCobranca(id, pacienteId);
        toast.success("Cobrança excluída com sucesso.");
        setOpenExcluir(false);
      } catch {
        toast.error("Não foi possível excluir a cobrança.");
      }
    });
  }

  function handlePagar() {
    startTransition(async () => {
      try {
        await marcarCobrancaPaga(id, pacienteId);
        toast.success("Cobrança marcada como paga.");
        setOpenPagar(false);
      } catch {
        toast.error("Não foi possível atualizar a cobrança.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!pago && (
        <Dialog open={openPagar} onOpenChange={setOpenPagar}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="Marcar como paga"
            >
              <Check className="size-4 text-emerald-600" />
              <span className="sr-only">Marcar como paga</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dar baixa na cobrança</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja marcar esta cobrança como paga?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPagar(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePagar} disabled={isPending}>
                {isPending ? "Confirmando..." : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/cobrancas/${id}/editar`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
      <Dialog open={openExcluir} onOpenChange={setOpenExcluir}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Trash2 className="size-4 text-destructive" />
            <span className="sr-only">Excluir</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cobrança</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta cobrança? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenExcluir(false)}>
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
