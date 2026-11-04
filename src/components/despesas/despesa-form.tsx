"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { CATEGORIAS_DESPESA, LABEL_CATEGORIA_DESPESA } from "@/lib/despesas";
import type { DespesaActionState } from "@/actions/despesas";

const initialState: DespesaActionState = {};

export type DespesaFormValues = {
  descricao: string;
  categoria: string;
  valor: string;
  data: string;
  status: string;
  pagoEm: string;
  fornecedor: string;
  numeroDocumento: string;
  observacao: string;
};

export function DespesaForm({
  action,
  defaultValues,
  hoje,
  mode,
}: {
  action: (prevState: DespesaActionState, formData: FormData) => Promise<DespesaActionState>;
  defaultValues: DespesaFormValues;
  /** "YYYY-MM-DD" de hoje em Brasília, vindo do server. */
  hoje: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  // Campos controlados: o React limpa os não controlados ao fim da action, e um erro de
  // validação faria a pessoa perder tudo o que digitou.
  const [valores, setValores] = useState(defaultValues);

  function campo(nome: keyof DespesaFormValues) {
    return {
      id: nome,
      name: nome,
      value: valores[nome],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setValores((atual) => ({ ...atual, [nome]: e.target.value })),
    };
  }

  useEffect(() => {
    if (state.success) {
      toast.success(mode === "create" ? "Despesa registrada." : "Despesa atualizada.");
      router.push(`/dashboard?tab=despesas&mes=${state.mes}`);
    }
  }, [state, mode, router]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input {...campo("descricao")} placeholder="Conta de luz de novembro" required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <NativeSelect {...campo("categoria")} required>
            <option value="" disabled>
              Selecione...
            </option>
            {CATEGORIAS_DESPESA.map((c) => (
              <option key={c} value={c}>
                {LABEL_CATEGORIA_DESPESA[c]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input {...campo("valor")} inputMode="decimal" placeholder="250,00" required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data da compra ou vencimento</Label>
          <Input {...campo("data")} type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Pagamento</Label>
          <NativeSelect {...campo("status")}>
            <option value="PENDENTE">A pagar</option>
            <option value="PAGO">Paga</option>
          </NativeSelect>
        </div>
        {valores.status === "PAGO" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="pagoEm">Data do pagamento</Label>
            <Input {...campo("pagoEm")} type="date" max={hoje} required />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fornecedor">Fornecedor (opcional)</Label>
          <Input {...campo("fornecedor")} placeholder="Companhia de energia" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="numeroDocumento">Nº da nota fiscal ou documento (opcional)</Label>
          <Input {...campo("numeroDocumento")} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea {...campo("observacao")} rows={3} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Registrar despesa" : "Salvar alterações"}
        onCancel={() => router.push("/dashboard?tab=despesas")}
      />
    </form>
  );
}
