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
          atendimentos: String(plano.atendimentos),
          valores: {
            A_VISTA: {
              MENSAL: plano.valorAVistaMensal.toFixed(2).replace(".", ","),
              TRIMESTRAL: plano.valorAVistaTrimestral.toFixed(2).replace(".", ","),
            },
            A_VISTA_NF: {
              MENSAL: plano.valorAVistaNfMensal.toFixed(2).replace(".", ","),
              TRIMESTRAL: plano.valorAVistaNfTrimestral.toFixed(2).replace(".", ","),
            },
            ATE_3X_CARTAO: {
              MENSAL: plano.valorAte3xCartaoMensal.toFixed(2).replace(".", ","),
              TRIMESTRAL: plano.valorAte3xCartaoTrimestral.toFixed(2).replace(".", ","),
            },
            ATE_3X_NF: {
              MENSAL: plano.valorAte3xNfMensal.toFixed(2).replace(".", ","),
              TRIMESTRAL: plano.valorAte3xNfTrimestral.toFixed(2).replace(".", ","),
            },
          },
        }}
        mode="edit"
      />
    </div>
  );
}
