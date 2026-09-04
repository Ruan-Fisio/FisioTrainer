"use client";

import { addMonths, format, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDiasDaGrade, getIntervaloVisivel } from "@/lib/calendario";

export type DiaDisp = {
  data: string;
  temHorarios: boolean;
  vagas: number;
  lotado: boolean;
};

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Grade mensal com destaque azul (disponível) / vermelho (lotado). Usada nos wizards de agendamento e remarcação. */
export function CalendarioDisponibilidade({
  mesRef,
  onMesChange,
  dias,
  carregando,
  diaSelecionado,
  onSelecionarDia,
  bloqueado = false,
}: {
  mesRef: Date;
  onMesChange: (d: Date) => void;
  dias: DiaDisp[] | null;
  carregando: boolean;
  diaSelecionado: string | null;
  onSelecionarDia: (data: string) => void;
  bloqueado?: boolean;
}) {
  const diasMap = new Map<string, DiaDisp>();
  dias?.forEach((d) => diasMap.set(d.data, d));

  const { inicio, fim } = getIntervaloVisivel("mes", mesRef);
  const gradeDias = getDiasDaGrade(inicio, fim);
  const hoje = hojeStr();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onMesChange(addMonths(mesRef, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">
          {format(mesRef, "MMMM yyyy", { locale: ptBR })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onMesChange(addMonths(mesRef, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="uppercase">
            {d}
          </span>
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-1",
          carregando && "pointer-events-none opacity-50",
        )}
      >
        {gradeDias.map((dia) => {
          const ds = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
          const doMes = isSameMonth(dia, mesRef);
          const info = diasMap.get(ds);
          const passado = ds < hoje;

          const disponivel =
            doMes && !passado && !bloqueado && !!info?.temHorarios && !info.lotado;
          const indisponivel = doMes && !disponivel;

          return (
            <button
              key={ds}
              type="button"
              disabled={!disponivel}
              onClick={() => onSelecionarDia(ds)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                !doMes && "border-transparent text-transparent",
                disponivel &&
                  "border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:border-blue-400 dark:text-blue-300",
                indisponivel &&
                  "border-red-500 bg-red-500/10 text-red-700 dark:border-red-400 dark:text-red-300",
                diaSelecionado === ds && "ring-2 ring-primary",
              )}
            >
              {indisponivel ? (
                <>
                  <span className="absolute left-1 top-0.5 text-[10px] leading-none opacity-70">
                    {dia.getDate()}
                  </span>
                  <X className="size-4" strokeWidth={2.5} />
                </>
              ) : (
                dia.getDate()
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-blue-500 bg-blue-500/10" />
          Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex size-3.5 items-center justify-center rounded-sm border border-red-500 bg-red-500/10">
            <X className="size-2.5 text-red-600 dark:text-red-400" strokeWidth={3} />
          </span>
          Indisponível
        </span>
      </div>
    </div>
  );
}
