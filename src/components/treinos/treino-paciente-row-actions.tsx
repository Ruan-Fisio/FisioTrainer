"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, PowerOff, Trash2 } from "lucide-react";
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
  desativarTreinoPaciente,
  deleteTreinoPaciente,
} from "@/actions/treinos-paciente";

export function TreinoPacienteRowActions({
  id,
  pacienteId,
  nome,
}: {
  id: string;
  pacienteId: string;
  nome: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDesativar() {
    startTransition(async () => {
      try {
        await desativarTreinoPaciente(id, pacienteId);
        toast.success("Treino desativado.");
      } catch {
        toast.error("Não foi possível desativar o treino.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTreinoPaciente(id, pacienteId);
        toast.success("Treino excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o treino.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/pacientes/${pacienteId}/treinos/${id}/editar`}>
          <Pencil className="size-4" />
          <span className="sr-only">Editar</span>
        </Link>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleDesativar}
        disabled={isPending}
      >
        <PowerOff className="size-4" />
        <span className="sr-only">Desativar</span>
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
            <DialogTitle>Excluir treino do paciente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{nome}</strong> deste
              paciente? Esta ação não pode ser desfeita.
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
