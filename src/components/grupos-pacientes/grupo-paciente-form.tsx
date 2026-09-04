"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/ui/form-actions";
import {
  PacienteMultiSelect,
  type PacienteOption,
} from "@/components/pacientes/paciente-multi-select";
import type { GrupoPacienteActionState } from "@/actions/grupos-pacientes";

const initialState: GrupoPacienteActionState = {};
const cancelHref = "/agenda/grupos";

export function GrupoPacienteForm({
  action,
  pacienteOptions,
  defaultValues,
  mode,
}: {
  action: (
    prevState: GrupoPacienteActionState,
    formData: FormData,
  ) => Promise<GrupoPacienteActionState>;
  pacienteOptions: PacienteOption[];
  defaultValues?: {
    nome: string;
    pacienteIds: string[];
  };
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [pacienteIds, setPacienteIds] = useState<string[]>(
    defaultValues?.pacienteIds ?? [],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Grupo criado com sucesso."
          : "Grupo atualizado com sucesso.",
      );
      router.push(cancelHref);
    }
  }, [state.success, mode, router]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6 pb-24">
      <input type="hidden" name="pacienteIds" value={JSON.stringify(pacienteIds)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome do grupo</Label>
        <Input id="nome" name="nome" defaultValue={defaultValues?.nome} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Pacientes</Label>
        <PacienteMultiSelect
          options={pacienteOptions}
          value={pacienteIds}
          onChange={setPacienteIds}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Criar grupo" : "Salvar alterações"}
        onCancel={() => router.push(cancelHref)}
      />
    </form>
  );
}
