"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Seletor de período via `?dias=` (a URL é a fonte da verdade). Grade de botões, sem
 * scroll horizontal em mobile. `opcoes` vem do server (whitelist de `parsePeriodo`).
 */
export function PeriodoFilter({
  dias,
  opcoes,
  paramName = "dias",
}: {
  dias: number;
  opcoes: readonly number[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function escolher(valor: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, String(valor));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div role="group" aria-label="Período" className="grid grid-cols-4 gap-2 sm:flex">
      {opcoes.map((d) => (
        <Button
          key={d}
          type="button"
          size="sm"
          variant={d === dias ? "default" : "outline"}
          aria-pressed={d === dias}
          className={cn(d === dias && "shadow-sm shadow-primary/20")}
          onClick={() => escolher(d)}
        >
          {d} dias
        </Button>
      ))}
    </div>
  );
}
