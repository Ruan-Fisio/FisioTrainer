"use client";

import { useRouter } from "next/navigation";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { horaDoDia, toDateInputValue } from "@/lib/format";
import { HORAS_DO_DIA } from "@/lib/calendario";
import { EventoChip } from "@/components/agendamentos/calendario/evento-chip";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

const DIA_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function GradeHoraria({ dias, eventos }: { dias: Date[]; eventos: EventoCalendario[] }) {
  const router = useRouter();

  function eventosDoDia(dia: Date) {
    return eventos.filter((evento) => mesmoDia(evento.dataInicio, dia));
  }

  function eventosDiaInteiro(dia: Date) {
    return eventosDoDia(dia).filter((e) => e.diaInteiro);
  }

  function eventosDaHora(dia: Date, hora: number) {
    return eventosDoDia(dia).filter(
      (e) => !e.diaInteiro && horaDoDia(e.dataInicio) === hora,
    );
  }

  function abrirNovoEvento(dia: Date, hora?: number) {
    const params = new URLSearchParams({ data: toDateInputValue(dia) });
    if (hora !== undefined) params.set("horaInicio", `${String(hora).padStart(2, "0")}:00`);
    router.push(`/agenda/novo?${params.toString()}`);
  }

  const temEventoDiaInteiro = dias.some((dia) => eventosDiaInteiro(dia).length > 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="grid border-b"
        style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(0, 1fr))` }}
      >
        <div />
        {dias.map((dia) => (
          <div key={dia.toISOString()} className="flex flex-col items-center gap-1 border-l py-2">
            <span className="text-xs uppercase text-muted-foreground">
              {DIA_SEMANA_CURTO[dia.getDay()]}
            </span>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                isToday(dia) && "bg-primary text-primary-foreground",
              )}
            >
              {dia.getDate()}
            </span>
          </div>
        ))}
      </div>

      {temEventoDiaInteiro && (
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(0, 1fr))` }}
        >
          <div className="border-r px-1 py-1 text-right text-[10px] text-muted-foreground">
            Dia todo
          </div>
          {dias.map((dia) => (
            <div key={dia.toISOString()} className="flex flex-col gap-1 border-l p-1">
              {eventosDiaInteiro(dia).map((evento) => (
                <EventoChip key={evento.id} evento={evento} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="max-h-[65vh] overflow-y-auto">
        {HORAS_DO_DIA.map((hora) => (
          <div
            key={hora}
            className="grid border-b last:border-b-0"
            style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(0, 1fr))` }}
          >
            <div className="border-r px-1 py-1 text-right text-[10px] text-muted-foreground">
              {String(hora).padStart(2, "0")}:00
            </div>
            {dias.map((dia) => (
              <div
                key={dia.toISOString()}
                onClick={() => abrirNovoEvento(dia, hora)}
                className="flex min-h-12 cursor-pointer flex-col gap-0.5 border-l p-1 transition-colors hover:bg-muted/30"
              >
                {eventosDaHora(dia, hora).map((evento) => (
                  <EventoChip key={evento.id} evento={evento} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
