"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VisaoCalendario } from "@/lib/calendario";
import { toDateInputValue } from "@/lib/format";

const VISOES: { value: VisaoCalendario; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Dia" },
];

export function CalendarioNav({
  visao,
  dataReferencia,
  titulo,
}: {
  visao: VisaoCalendario;
  dataReferencia: Date;
  titulo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function irPara(novaData: Date, novaVisao?: VisaoCalendario) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("data", toDateInputValue(novaData));
    if (novaVisao) params.set("view", novaVisao);
    router.push(`/agenda?${params.toString()}`);
  }

  function navegar(direcao: 1 | -1) {
    if (visao === "mes") return irPara(addMonths(dataReferencia, direcao));
    if (visao === "semana") return irPara(addWeeks(dataReferencia, direcao));
    return irPara(addDays(dataReferencia, direcao));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navegar(-1)}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Anterior</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => irPara(new Date())}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={() => navegar(1)}>
          <ChevronRight className="size-4" />
          <span className="sr-only">Próximo</span>
        </Button>
        <h2 className="ml-2 text-lg font-medium capitalize">{titulo}</h2>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {VISOES.map((opcao) => (
          <button
            key={opcao.value}
            type="button"
            onClick={() => irPara(dataReferencia, opcao.value)}
            aria-pressed={visao === opcao.value}
            className="rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {opcao.label}
          </button>
        ))}
      </div>
    </div>
  );
}
