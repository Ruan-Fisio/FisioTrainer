import { notFound } from "next/navigation";
import { getCobranca, updateCobranca } from "@/actions/cobrancas";
import { CobrancaForm } from "@/components/cobrancas/cobranca-form";
import { toDateInputValue } from "@/lib/format";

export default async function EditarCobrancaPage({
  params,
}: {
  params: Promise<{ id: string; cobrancaId: string }>;
}) {
  const { id, cobrancaId } = await params;

  const cobranca = await getCobranca(cobrancaId);

  if (!cobranca || cobranca.pacienteId !== id) notFound();

  const updateCobrancaComId = updateCobranca.bind(null, cobrancaId, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar cobrança</h1>
        <p className="text-sm text-muted-foreground">
          Atualize o valor, o vencimento ou o status do pagamento.
        </p>
      </div>
      <CobrancaForm
        action={updateCobrancaComId}
        defaultValues={{
          planoNome: cobranca.planoNome,
          valor: cobranca.valor.toFixed(2).replace(".", ","),
          vencimento: toDateInputValue(cobranca.vencimento),
          status: cobranca.status,
          observacao: cobranca.observacao ?? "",
        }}
        pacienteId={id}
        mode="edit"
      />
    </div>
  );
}
