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
import {
  AnexosPaciente,
  type AnexoItem,
} from "@/components/pacientes/anexos-paciente";
import {
  confirmarAnexoPaciente,
  removerAnexoPaciente,
  solicitarUploadAnexoPaciente,
} from "@/actions/paciente-anexos";

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
  anexos,
}: {
  paciente: HistoricoPaciente & { id: string };
  anexos: AnexoItem[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ClipboardList />
          Histórico clínico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico clínico</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HISTORICO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {paciente[key] || "—"}
              </p>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Exames e anexos</h3>
          <AnexosPaciente
            anexos={anexos}
            solicitarUpload={solicitarUploadAnexoPaciente.bind(null, paciente.id)}
            confirmar={confirmarAnexoPaciente.bind(null, paciente.id)}
            remover={removerAnexoPaciente}
            permitirExcluir
            mostrarOrigem
            vazio="Nenhum anexo neste paciente."
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
