"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, Pencil, Trash2, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RemarcarConteudo } from "@/components/agendamentos/remarcar-conteudo";
import {
  MODALIDADE_AGENDAMENTO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";
import { deleteAgendamento } from "@/actions/agendamentos";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

type Visao = "detalhes" | "remarcar" | "excluir";

function formatarIntervalo(evento: EventoCalendario) {
  if (evento.diaInteiro) return "Dia inteiro";
  const opcoes: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${evento.dataInicio.toLocaleTimeString("pt-BR", opcoes)} – ${evento.dataFim.toLocaleTimeString("pt-BR", opcoes)}`;
}

export function EventoChip({
  evento,
  className,
}: {
  evento: EventoCalendario;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [visao, setVisao] = useState<Visao>("detalhes");
  const [escopo, setEscopo] = useState<"esta" | "seguintes" | "todas">("esta");
  const [isPending, startTransition] = useTransition();

  const corStatus =
    STATUS_AGENDAMENTO_LABEL[evento.status]?.className ??
    "bg-primary/15 text-primary hover:bg-primary/25";

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAgendamento(evento.id, escopo);
        toast.success("Evento excluído com sucesso.");
        setOpen(false);
      } catch {
        toast.error("Não foi possível excluir o evento.");
      }
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setVisao("detalhes");
      setEscopo("esta");
    }
  }

  const data = evento.dataInicio.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
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
            })}
          </span>
        )}
        {evento.titulo}
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {visao === "excluir" && (
            <>
              <DialogHeader>
                <DialogTitle>Excluir evento</DialogTitle>
                <DialogDescription>
                  {evento.serieId
                    ? "Este evento faz parte de uma série recorrente. O que você deseja excluir?"
                    : "Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita."}
                </DialogDescription>
              </DialogHeader>

              {evento.serieId && (
                <RadioGroup
                  value={escopo}
                  onValueChange={(value) => setEscopo(value as typeof escopo)}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="esta" id="evento-escopo-esta" />
                    <Label htmlFor="evento-escopo-esta" className="font-normal">
                      Este evento
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="seguintes" id="evento-escopo-seguintes" />
                    <Label htmlFor="evento-escopo-seguintes" className="font-normal">
                      Este e os seguintes
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="todas" id="evento-escopo-todas" />
                    <Label htmlFor="evento-escopo-todas" className="font-normal">
                      Todos os eventos da série
                    </Label>
                  </div>
                </RadioGroup>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setVisao("detalhes")}
                  disabled={isPending}
                >
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </>
          )}

          {visao === "remarcar" && (
            <>
              <DialogHeader>
                <DialogTitle>Remarcar evento</DialogTitle>
                <DialogDescription>
                  {evento.titulo} · escolha um horário livre.
                </DialogDescription>
              </DialogHeader>
              <RemarcarConteudo
                agendamento={{
                  id: evento.id,
                  titulo: evento.titulo,
                  modalidade: evento.modalidade,
                  profissionalId: evento.profissional?.id ?? null,
                  dataInicio: evento.dataInicio,
                  dataFim: evento.dataFim,
                }}
                cancelLabel="Voltar"
                onCancel={() => setVisao("detalhes")}
                onSuccess={() => setOpen(false)}
              />
            </>
          )}

          {visao === "detalhes" && (
            <>
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
                {evento.pacientes.length > 0 && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <Users className="mt-0.5 size-4 shrink-0" />
                    {evento.pacientes.map((p) => p.nome).join(", ")}
                  </p>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setVisao("excluir")}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setVisao("remarcar")}>
                    <CalendarClock className="size-4" />
                    Remarcar
                  </Button>
                  <Link
                    href={`/agenda/${evento.id}/editar`}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Link>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
