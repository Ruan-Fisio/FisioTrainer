"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlotDisponivel = {
  horario: string;
  vagas: number;
  capacidade: number;
};

/** Grade de horários com pílulas azul (vaga) / vermelho riscado (lotado). Usada nos wizards. */
export function GradeHorariosDisponiveis({
  slots,
  carregando,
  horaSelecionada,
  onSelecionar,
  vazioLabel = "Nenhum horário disponível.",
}: {
  slots: SlotDisponivel[] | null;
  carregando: boolean;
  horaSelecionada: string | null;
  onSelecionar: (horario: string) => void;
  vazioLabel?: string;
}) {
  if (carregando) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando horários…
      </p>
    );
  }

  if (!slots || slots.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{vazioLabel}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const cheio = s.vagas <= 0;
        const ativo = horaSelecionada === s.horario;
        return (
          <button
            key={s.horario}
            type="button"
            disabled={cheio}
            onClick={() => onSelecionar(s.horario)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-sm transition-colors",
              cheio
                ? "border-red-500 bg-red-500/10 text-red-700 line-through dark:border-red-400 dark:text-red-300"
                : "border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:border-blue-400 dark:text-blue-300",
              ativo && "ring-2 ring-primary",
            )}
          >
            {s.horario}
            <span className="text-[10px] opacity-70">
              {s.vagas}/{s.capacidade}
            </span>
          </button>
        );
      })}
    </div>
  );
}
