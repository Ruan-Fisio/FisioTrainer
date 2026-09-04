"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RemarcarConteudo,
  type RemarcarAlvo,
} from "@/components/agendamentos/remarcar-conteudo";

export function RemarcarDialog({ agendamento }: { agendamento: RemarcarAlvo }) {
  const [open, setOpen] = useState(false);

  const duracaoMin = Math.round(
    (agendamento.dataFim.getTime() - agendamento.dataInicio.getTime()) / 60000,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="size-4" />
        Remarcar
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remarcar evento</DialogTitle>
          <DialogDescription>
            {agendamento.titulo} · duração de {duracaoMin} min. Escolha um horário livre —
            horários ocupados aparecem desabilitados.
          </DialogDescription>
        </DialogHeader>
        <RemarcarConteudo
          agendamento={agendamento}
          onCancel={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
