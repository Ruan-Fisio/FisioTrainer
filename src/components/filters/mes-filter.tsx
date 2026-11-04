"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deslocarMes, rotuloMesExtenso } from "@/lib/despesas";

/** Navega entre meses via `?mes=YYYY-MM`. O mês selecionado vem do server, a URL é a fonte. */
export function MesFilter({
  mes,
  mesAtual,
  paramName = "mes",
}: {
  mes: string;
  mesAtual: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irPara(destino: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, destino);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => irPara(deslocarMes(mes, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span aria-live="polite" className="min-w-40 text-center text-sm font-medium first-letter:uppercase">
        {rotuloMesExtenso(mes)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => irPara(deslocarMes(mes, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
      {mes !== mesAtual && (
        <Button type="button" variant="ghost" size="sm" onClick={() => irPara(mesAtual)}>
          Mês atual
        </Button>
      )}
    </div>
  );
}
