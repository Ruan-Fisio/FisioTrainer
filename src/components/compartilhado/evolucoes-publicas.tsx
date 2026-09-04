"use client";

import { ChevronDown, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { getEvolucoesByPaciente } from "@/actions/evolucoes";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

type Evolucao = Awaited<ReturnType<typeof getEvolucoesByPaciente>>[number];

const TEXTO: { key: keyof Evolucao; label: string }[] = [
  { key: "hdp", label: "HDP (Histórico da Doença Pregressa)" },
  { key: "hda", label: "HDA (Histórico da Doença Atual)" },
];
const VITAIS: { key: keyof Evolucao; label: string }[] = [
  { key: "pa", label: "PA" },
  { key: "fc", label: "FC" },
  { key: "spo2", label: "SpO2" },
  { key: "fr", label: "FR" },
  { key: "temperatura", label: "Temperatura" },
];
const FINAL: { key: keyof Evolucao; label: string }[] = [
  { key: "evolucao", label: "Evolução" },
  { key: "conduta", label: "Conduta" },
];

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{valor || "—"}</p>
    </div>
  );
}

export function EvolucoesPublicas({ evolucoes }: { evolucoes: Evolucao[] }) {
  if (evolucoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma evolução registrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {evolucoes.map((evolucao) => (
        <Card key={evolucao.id} className="p-0">
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-4 text-left">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{formatarData(evolucao.data)}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Stethoscope className="size-3.5" />
                  {evolucao.profissional.name}
                </p>
              </div>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-4 border-t p-4">
                {TEXTO.map(({ key, label }) => (
                  <Campo key={key} label={label} valor={String(evolucao[key] ?? "")} />
                ))}
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sinais Vitais
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {VITAIS.map(({ key, label }) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm">{String(evolucao[key] ?? "—")}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Campo
                  label="Ausculta Pulmonar"
                  valor={evolucao.auscultaPulmonar ?? ""}
                />
                {FINAL.map(({ key, label }) => (
                  <Campo key={key} label={label} valor={String(evolucao[key] ?? "")} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
