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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { deleteAgendamento } from "@/actions/agendamentos";
import { RemarcarDialog } from "@/components/agendamentos/remarcar-dialog";
import type { RemarcarAlvo } from "@/components/agendamentos/remarcar-conteudo";

export function AgendamentoRowActions({
  id,
  serieId,
  remarcar,
}: {
  id: string;
  serieId?: string | null;
  remarcar?: Omit<RemarcarAlvo, "id">;
}) {
  const [open, setOpen] = useState(false);
  const [escopo, setEscopo] = useState<"esta" | "seguintes" | "todas">("esta");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAgendamento(id, escopo);
        toast.success("Evento excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o evento.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {remarcar && (
        <RemarcarDialog agendamento={{ id, ...remarcar }} />
      )}
      <Button variant="outline" size="icon" asChild>
        <Link href={`/agenda/${id}/editar`}>
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
            <DialogTitle>Excluir evento</DialogTitle>
            <DialogDescription>
              {serieId
                ? "Este evento faz parte de uma série recorrente. O que você deseja excluir?"
                : "Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>

          {serieId && (
            <RadioGroup
              value={escopo}
              onValueChange={(value) => setEscopo(value as typeof escopo)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="esta" id="escopo-esta" />
                <Label htmlFor="escopo-esta" className="font-normal">
                  Este evento
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="seguintes" id="escopo-seguintes" />
                <Label htmlFor="escopo-seguintes" className="font-normal">
                  Este e os seguintes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="todas" id="escopo-todas" />
                <Label htmlFor="escopo-todas" className="font-normal">
                  Todos os eventos da série
                </Label>
              </div>
            </RadioGroup>
          )}

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
    </div>
  );
}
