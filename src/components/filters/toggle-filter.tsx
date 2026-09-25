"use client";

import type { ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Filtro binário (liga/desliga) via URL — mesmo contrato dos demais filtros de `src/components/filters/`. */
export function ToggleFilter({
  paramName,
  label,
  icon,
  active,
}: {
  paramName: string;
  label: string;
  icon?: ReactNode;
  active: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete(paramName);
    } else {
      params.set(paramName, "1");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={cn("shrink-0 gap-2", active && "shadow-sm shadow-primary/20")}
      onClick={toggle}
    >
      {icon}
      {label}
    </Button>
  );
}
