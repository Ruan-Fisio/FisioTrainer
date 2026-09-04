"use client";

import { useRouter } from "next/navigation";
import { isSameMonth, isToday } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/format";
import { getDiasDaGrade } from "@/lib/calendario";
import { EventoChip } from "@/components/agendamentos/calendario/evento-chip";
import type { EventoCalendario } from "@/components/agendamentos/calendario/types";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MAX_VISIVEIS = 3;

export function CalendarioMes({
  inicio,
  fim,
  dataReferencia,
  eventos,
}: {
  inicio: Date;
  fim: Date;
  dataReferencia: Date;
  eventos: EventoCalendario[];
}) {
  const router = useRouter();
  const dias = getDiasDaGrade(inicio, fim);

  function eventosDoDia(dia: Date) {
    // Casa por data-calendário no fuso da clínica (não por instante), senão um
    // evento às 13h de Brasília cai fora da célula quando o servidor está em UTC.
    const alvo = toDateInputValue(dia);
    return eventos
      .filter(
        (evento) =>
          toDateInputValue(evento.dataInicio) <= alvo &&
          alvo <= toDateInputValue(evento.dataFim),
      )
      .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="px-2 py-2 text-center uppercase">
            {dia}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const eventosDia = eventosDoDia(dia);
          const visiveis = eventosDia.slice(0, MAX_VISIVEIS);
          const restantes = eventosDia.length - visiveis.length;

          return (
            <div
              key={dia.toISOString()}
              onClick={() => router.push(`/agenda/novo?data=${toDateInputValue(dia)}`)}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 border-b border-r p-1.5 transition-colors hover:bg-muted/30 sm:min-h-28",
                !isSameMonth(dia, dataReferencia) && "bg-muted/20 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(dia) && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {dia.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visiveis.map((evento) => (
                  <EventoChip key={evento.id} evento={evento} />
                ))}
                {restantes > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="w-fit text-left text-xs text-muted-foreground hover:underline"
                      >
                        +{restantes} mais
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="flex w-64 flex-col gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="mb-1 text-sm font-medium">
                        {dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                      </p>
                      {eventosDia.map((evento) => (
                        <EventoChip key={evento.id} evento={evento} />
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
