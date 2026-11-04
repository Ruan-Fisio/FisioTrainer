import { createDespesa } from "@/actions/despesas";
import { DespesaForm } from "@/components/despesas/despesa-form";
import { toDateInputValue } from "@/lib/format";

export default function NovaDespesaPage() {
  const hoje = toDateInputValue(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova despesa</h1>
        <p className="text-sm text-muted-foreground">
          Registre um gasto da clínica, como uma conta ou um equipamento comprado.
        </p>
      </div>
      <DespesaForm
        action={createDespesa}
        hoje={hoje}
        mode="create"
        defaultValues={{
          descricao: "",
          categoria: "",
          valor: "",
          data: hoje,
          status: "PENDENTE",
          pagoEm: hoje,
          fornecedor: "",
          numeroDocumento: "",
          observacao: "",
        }}
      />
    </div>
  );
}
