"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { deleteExecucao } from "@/actions/exame-execucoes";

export function ExecucaoDetailActions({
  id,
  pacienteId,
  tipo,
}: {
  id: string;
  pacienteId: string;
  tipo: "AVALIACAO" | "RETORNO";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rotulo = tipo === "AVALIACAO" ? "avaliação" : "retorno";

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteExecucao(id, pacienteId);
        toast.success(
          `${tipo === "AVALIACAO" ? "Avaliação" : "Retorno"} excluído com sucesso.`,
        );
        setOpen(false);
        router.push(`/pacientes/${pacienteId}`);
      } catch {
        toast.error(`Não foi possível excluir ${tipo === "AVALIACAO" ? "a avaliação" : "o retorno"}.`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/pacientes/${pacienteId}/exames/${id}/editar`}>
          <Pencil />
          Editar
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="text-destructive" />
            Excluir
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {tipo === "AVALIACAO" ? "avaliação" : "retorno"}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta {rotulo}?
              {tipo === "AVALIACAO" &&
                " Todos os retornos vinculados a ela também serão excluídos."}{" "}
              Esta ação não pode ser desfeita.
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
