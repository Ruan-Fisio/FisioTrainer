"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const HISTORICO_FIELDS: { key: keyof HistoricoPaciente; label: string }[] = [
  { key: "historicoClinico", label: "Histórico Clínico" },
  { key: "objetivo", label: "Objetivo" },
  { key: "doencasPreexistentes", label: "Doenças Pré-existentes" },
  { key: "cirurgiasAnteriores", label: "Cirurgias Anteriores" },
  { key: "medicamentos", label: "Medicamentos" },
];

type HistoricoPaciente = {
  historicoClinico: string | null;
  objetivo: string | null;
  doencasPreexistentes: string | null;
  cirurgiasAnteriores: string | null;
  medicamentos: string | null;
};

export function HistoricoClinicoDialog({
  paciente,
}: {
  paciente: HistoricoPaciente;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardList />
          Histórico clínico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico clínico</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HISTORICO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-sm">{paciente[key] || "—"}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
