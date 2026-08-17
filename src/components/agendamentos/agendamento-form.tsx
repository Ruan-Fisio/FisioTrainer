"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import type { AgendamentoActionState } from "@/actions/agendamentos";

const initialState: AgendamentoActionState = {};

export const TIPOS_AGENDAMENTO = [
  { value: "RETORNO", label: "Retorno / Reavaliação" },
  { value: "AVALIACAO", label: "Avaliação" },
  { value: "SESSAO", label: "Sessão" },
];

export const STATUS_AGENDAMENTO = [
  { value: "AGENDADO", label: "Agendado" },
  { value: "COMPARECEU", label: "Compareceu" },
  { value: "FALTOU", label: "Faltou" },
  { value: "CANCELADO", label: "Cancelado" },
];

export function AgendamentoForm({
  action,
  pacientes,
  defaultValues,
  cancelHref,
  mode,
}: {
  action: (
    prevState: AgendamentoActionState,
    formData: FormData,
  ) => Promise<AgendamentoActionState>;
  pacientes: { id: string; nome: string }[];
  defaultValues?: {
    pacienteId: string;
    data: string;
    hora: string;
    tipo: string;
    status: string;
    observacao: string;
  };
  cancelHref: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Agendamento criado com sucesso."
          : "Agendamento atualizado com sucesso.",
      );
      router.push(cancelHref);
    }
  }, [state.success, mode, cancelHref, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pacienteId">Paciente</Label>
        <NativeSelect
          id="pacienteId"
          name="pacienteId"
          defaultValue={defaultValues?.pacienteId}
          required
        >
          <option value="">Selecione um paciente</option>
          {pacientes.map((paciente) => (
            <option key={paciente.id} value={paciente.id}>
              {paciente.nome}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={defaultValues?.data}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hora">Horário</Label>
          <Input
            id="hora"
            name="hora"
            type="time"
            defaultValue={defaultValues?.hora}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <NativeSelect
            id="tipo"
            name="tipo"
            defaultValue={defaultValues?.tipo ?? "RETORNO"}
          >
            {TIPOS_AGENDAMENTO.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "AGENDADO"}
          >
            {STATUS_AGENDAMENTO.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacao">Observação</Label>
        <Textarea
          id="observacao"
          name="observacao"
          rows={3}
          defaultValue={defaultValues?.observacao}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Agendar" : "Salvar alterações"}
        onCancel={() => router.push(cancelHref)}
      />
    </form>
  );
}
