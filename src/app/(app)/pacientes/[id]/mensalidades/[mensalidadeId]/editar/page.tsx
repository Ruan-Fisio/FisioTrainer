import { notFound } from "next/navigation";
import { getMensalidade, updateMensalidade } from "@/actions/mensalidades";
import { MensalidadeForm } from "@/components/mensalidades/mensalidade-form";
import { toDateInputValue } from "@/lib/format";

export default async function EditarMensalidadePage({
  params,
}: {
  params: Promise<{ id: string; mensalidadeId: string }>;
}) {
  const { id, mensalidadeId } = await params;

  const mensalidade = await getMensalidade(mensalidadeId);

  if (!mensalidade || mensalidade.pacienteId !== id) notFound();

  const updateMensalidadeWithId = updateMensalidade.bind(
    null,
    mensalidadeId,
    id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar mensalidade</h1>
        <p className="text-sm text-muted-foreground">
          Atualize o valor, o vencimento ou o status do pagamento.
        </p>
      </div>
      <MensalidadeForm
        action={updateMensalidadeWithId}
        defaultValues={{
          planoNome: mensalidade.planoNome,
          valor: mensalidade.valor.toFixed(2).replace(".", ","),
          vencimento: toDateInputValue(mensalidade.vencimento),
          status: mensalidade.status,
          observacao: mensalidade.observacao ?? "",
        }}
        pacienteId={id}
        mode="edit"
      />
    </div>
  );
}
