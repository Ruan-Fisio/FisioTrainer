"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import type { CobrancaActionState } from "@/actions/cobrancas";

const initialState: CobrancaActionState = {};

export function CobrancaForm({
  action,
  defaultValues,
  pacienteId,
  mode,
}: {
  action: (
    prevState: CobrancaActionState,
    formData: FormData,
  ) => Promise<CobrancaActionState>;
  defaultValues?: {
    planoNome: string;
    valor: string;
    vencimento: string;
    status: string;
    observacao: string;
  };
  pacienteId: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Cobrança registrada com sucesso."
          : "Cobrança atualizada com sucesso.",
      );
      router.push(`/pacientes/${pacienteId}`);
    }
  }, [state.success, mode, pacienteId, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2">
        <Label htmlFor="planoNome">Plano</Label>
        <Input
          id="planoNome"
          name="planoNome"
          defaultValue={defaultValues?.planoNome}
          placeholder="Mensal Recovery"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            name="valor"
            inputMode="decimal"
            placeholder="250,00"
            defaultValue={defaultValues?.valor}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vencimento">Data de Vencimento</Label>
          <Input
            id="vencimento"
            name="vencimento"
            type="date"
            defaultValue={defaultValues?.vencimento}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Pagamento</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "PENDENTE"}
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
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
        submitLabel={
          mode === "create" ? "Registrar cobrança" : "Salvar alterações"
        }
        onCancel={() => router.push(`/pacientes/${pacienteId}`)}
      />
    </form>
  );
}
