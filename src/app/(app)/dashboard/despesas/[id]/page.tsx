import { notFound } from "next/navigation";
import { getDespesa, updateDespesa } from "@/actions/despesas";
import { DespesaForm } from "@/components/despesas/despesa-form";
import { toDateInputValue } from "@/lib/format";

export default async function EditarDespesaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const despesa = await getDespesa(id);
  if (!despesa) notFound();

  const hoje = toDateInputValue(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar despesa</h1>
        <p className="text-sm text-muted-foreground">{despesa.descricao}</p>
      </div>
      <DespesaForm
        action={updateDespesa.bind(null, id)}
        hoje={hoje}
        mode="edit"
        defaultValues={{
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor.toFixed(2).replace(".", ","),
          data: toDateInputValue(despesa.data),
          status: despesa.status,
          pagoEm: despesa.pagoEm ? toDateInputValue(despesa.pagoEm) : hoje,
          fornecedor: despesa.fornecedor ?? "",
          numeroDocumento: despesa.numeroDocumento ?? "",
          observacao: despesa.observacao ?? "",
        }}
      />
    </div>
  );
}
