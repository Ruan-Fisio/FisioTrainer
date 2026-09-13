"use client";

import { useState } from "react";
import { DoorOpen, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MODALIDADE_AGENDAMENTO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

function formatarIntervalo(evento: EventoCalendario) {
  if (evento.diaInteiro) return "Dia inteiro";
  const opcoes: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  };
  return `${evento.dataInicio.toLocaleTimeString("pt-BR", opcoes)} – ${evento.dataFim.toLocaleTimeString("pt-BR", opcoes)}`;
}

/**
 * Chip de evento no calendário. A agenda é **só visualização** — clicar abre um diálogo
 * apenas com os detalhes. Agendar/remarcar/marcar presença é na aba do paciente ou no dashboard.
 */
export function EventoChip({
  evento,
  className,
}: {
  evento: EventoCalendario;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const corStatus =
    STATUS_AGENDAMENTO_LABEL[evento.status]?.className ??
    "bg-primary/15 text-primary hover:bg-primary/25";

  const data = evento.dataInicio.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "w-full truncate rounded-md px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:brightness-95",
          corStatus,
          className,
        )}
        title={evento.titulo}
      >
        {!evento.diaInteiro && (
          <span className="mr-1 tabular-nums opacity-80">
            {evento.dataInicio.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            })}
          </span>
        )}
        {evento.titulo}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{evento.titulo}</DialogTitle>
            <DialogDescription className="capitalize">
              {data} · {formatarIntervalo(evento)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium",
                  STATUS_AGENDAMENTO_LABEL[evento.status]?.className,
                )}
              >
                {STATUS_AGENDAMENTO_LABEL[evento.status]?.label ?? evento.status}
              </span>
              <span className="text-muted-foreground">
                {MODALIDADE_AGENDAMENTO_LABEL[evento.modalidade] ?? evento.modalidade}
              </span>
            </div>
            {evento.profissional && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4 shrink-0" />
                {evento.profissional.name}
              </p>
            )}
            {evento.sala && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <DoorOpen className="size-4 shrink-0" />
                {evento.sala.nome}
              </p>
            )}
            {evento.pacientes.length > 0 && (
              <p className="flex items-start gap-2 text-muted-foreground">
                <Users className="mt-0.5 size-4 shrink-0" />
                {evento.pacientes.map((p) => p.nome).join(", ")}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Para remarcar ou marcar presença, abra este atendimento na aba
            Agendamentos do paciente ou no dashboard.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
