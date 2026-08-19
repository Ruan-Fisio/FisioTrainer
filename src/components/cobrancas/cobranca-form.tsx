"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import { aplicarTaxaNotaFiscal, TAXA_NOTA_FISCAL } from "@/lib/planos";
import { formatarMoeda } from "@/lib/format";
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
    notaFiscal?: boolean;
  };
  pacienteId: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [valor, setValor] = useState(defaultValues?.valor ?? "");
  const [notaFiscal, setNotaFiscal] = useState(defaultValues?.notaFiscal ?? false);

  const valorFinal = useMemo(() => {
    const numero = Number(valor.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(numero)) return 0;
    return aplicarTaxaNotaFiscal(numero, notaFiscal);
  }, [valor, notaFiscal]);

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
            value={valor}
            onChange={(e) => setValor(e.target.value)}
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

      <input type="hidden" name="notaFiscal" value={String(notaFiscal)} />
      <label
        onClick={(e) => {
          e.preventDefault();
          setNotaFiscal((v) => !v);
        }}
        className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
      >
        <Checkbox checked={notaFiscal} tabIndex={-1} className="pointer-events-none" />
        Nota fiscal inclusa (aplica taxa de {TAXA_NOTA_FISCAL}%)
      </label>
      {notaFiscal && valorFinal > 0 && (
        <p className="text-sm text-muted-foreground">
          Valor com nota fiscal: <span className="font-medium text-foreground">{formatarMoeda(valorFinal)}</span>
        </p>
      )}

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
