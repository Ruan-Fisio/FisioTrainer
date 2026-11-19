"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Beacon de page view para `/metrics` (spec 001). Dispara na mudança de pathname; o
 * `useRef` evita contar duas vezes (React Strict Mode em dev). Falha em silêncio.
 * Só o pathname é enviado — o servidor normaliza e remove IDs/tokens.
 */
export function RastreadorAcesso() {
  const pathname = usePathname();
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || ultimo.current === pathname) return;
    ultimo.current = pathname;
    try {
      void fetch("/api/metricas/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignora
    }
  }, [pathname]);

  return null;
}
