"use client";

import { Ban } from "lucide-react";
import {
  CORES_OPCAO,
  COR_OPCAO_CLASSES,
  COR_OPCAO_LABEL,
  ehCorOpcao,
} from "@/lib/cor-opcao";
import { cn } from "@/lib/utils";

/** Escolha da cor de destaque de uma opção: nenhuma ou uma das 5 cores da paleta. */
export function CorOpcaoSelect({
  value,
  rotulo,
  onChange,
}: {
  value: string;
  /** Texto da opção, só pra compor o nome acessível do grupo. */
  rotulo: string;
  onChange: (cor: string) => void;
}) {
  const atual = ehCorOpcao(value) ? value : "";
  return (
    <div
      role="radiogroup"
      aria-label={`Cor de destaque da opção "${rotulo}"`}
      className="flex shrink-0 items-center gap-1"
    >
      <button
        type="button"
        role="radio"
        aria-checked={atual === ""}
        title="Sem destaque"
        onClick={() => onChange("")}
        className={cn(
          "flex size-6 items-center justify-center rounded-full border text-muted-foreground transition-shadow",
          atual === "" ? "ring-2 ring-ring ring-offset-1" : "opacity-60",
        )}
      >
        <Ban className="size-3.5" />
        <span className="sr-only">Sem destaque</span>
      </button>
      {CORES_OPCAO.map((cor) => (
        <button
          key={cor}
          type="button"
          role="radio"
          aria-checked={atual === cor}
          title={COR_OPCAO_LABEL[cor]}
          onClick={() => onChange(cor)}
          className={cn(
            "size-6 rounded-full border border-black/10 transition-shadow",
            COR_OPCAO_CLASSES[cor].ponto,
            atual === cor ? "ring-2 ring-ring ring-offset-1" : "opacity-70",
          )}
        >
          <span className="sr-only">{COR_OPCAO_LABEL[cor]}</span>
        </button>
      ))}
    </div>
  );
}
