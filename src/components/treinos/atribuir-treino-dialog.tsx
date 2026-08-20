"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import {
  assignTreino,
  listAllTreinos,
  type AtribuirTreinoActionState,
} from "@/actions/treinos";
import { listAllPacientes } from "@/actions/pacientes";

const initialState: AtribuirTreinoActionState = {};

export function AtribuirTreinoDialog({
  open,
  onOpenChange,
  treinoIdsIniciais = [],
  pacienteIdFixo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinoIdsIniciais?: string[];
  pacienteIdFixo?: string;
}) {
  const [state, formAction] = useActionState(assignTreino, initialState);
  const [treinos, setTreinos] = useState<{ id: string; nome: string }[]>([]);
  const [pacientes, setPacientes] = useState<{ id: string; nome: string }[]>([]);
  const [treinoIds, setTreinoIds] = useState<string[]>(treinoIdsIniciais);
  const [pacienteId, setPacienteId] = useState(pacienteIdFixo ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTreinoIds(treinoIdsIniciais);
    setLoading(true);
    Promise.all([listAllTreinos(), pacienteIdFixo ? null : listAllPacientes()])
      .then(([treinosData, pacientesData]) => {
        setTreinos(treinosData);
        if (pacientesData) setPacientes(pacientesData);
        if (!pacienteIdFixo && pacientesData && pacientesData.length > 0) {
          setPacienteId((prev) => prev || pacientesData[0].id);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (state.success) {
      toast.success("Treino atribuído com sucesso.");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  function toggleTreino(id: string) {
    setTreinoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (treinoIds.length === 0) {
      event.preventDefault();
      toast.error("Selecione ao menos um treino.");
      return;
    }
    if (!pacienteId) {
      event.preventDefault();
      toast.error("Selecione um paciente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Atribuir treino</DialogTitle>
            <DialogDescription>
              A cópia do treino atribuída ao paciente é independente do
              modelo — editar o modelo depois não afeta a cópia.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="treinoIds" value={JSON.stringify(treinoIds)} />
          <input type="hidden" name="pacienteId" value={pacienteId} />

          <div className="flex flex-col gap-4 py-4">
            {!pacienteIdFixo && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="pacienteId">Paciente</Label>
                <NativeSelect
                  id="pacienteId"
                  value={pacienteId}
                  onChange={(event) => setPacienteId(event.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecionar paciente</option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Treinos</Label>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                {loading && (
                  <p className="p-2 text-sm text-muted-foreground">Carregando...</p>
                )}
                {!loading && treinos.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Nenhum treino cadastrado na biblioteca.
                  </p>
                )}
                {treinos.map((treino) => (
                  <label
                    key={treino.id}
                    onClick={(event) => {
                      event.preventDefault();
                      toggleTreino(treino.id);
                    }}
                    className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 text-sm select-none hover:bg-muted"
                  >
                    <Checkbox
                      checked={treinoIds.includes(treino.id)}
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                    {treino.nome}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input id="dataInicio" name="dataInicio" type="date" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataFim">Data de fim</Label>
                <Input id="dataFim" name="dataFim" type="date" />
              </div>
            </div>

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Atribuir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
