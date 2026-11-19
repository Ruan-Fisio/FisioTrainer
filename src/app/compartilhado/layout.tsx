import type { ReactNode } from "react";
import { RastreadorAcesso } from "@/components/metricas/rastreador-acesso";

/** Layout raiz do portal público: só monta o beacon de métricas (spec 001). */
export default function CompartilhadoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RastreadorAcesso />
      {children}
    </>
  );
}
