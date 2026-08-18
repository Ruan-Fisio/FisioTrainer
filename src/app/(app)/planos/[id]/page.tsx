import { notFound } from "next/navigation";
import { getPlano, updatePlano } from "@/actions/planos";
import { PlanoForm } from "@/components/planos/plano-form";

export default async function EditarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const plano = await getPlano(id);

  if (!plano) notFound();

  const updatePlanoWithId = updatePlano.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar plano</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {plano.nome}.
        </p>
      </div>
      <PlanoForm
        action={updatePlanoWithId}
        defaultValues={{
          nome: plano.nome,
          descricao: plano.descricao ?? "",
          tipos: plano.tipos,
          opcoes: plano.opcoes.map((o) => ({
            atendimentos: String(o.atendimentos),
            valor: o.valor.toFixed(2).replace(".", ","),
          })),
          taxaCartao: plano.taxaCartao.toFixed(2).replace(".", ","),
        }}
        mode="edit"
      />
    </div>
  );
}
