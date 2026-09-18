import { notFound } from "next/navigation";
import { getPlano, updatePlano } from "@/actions/planos";
import { listSalas } from "@/actions/salas";
import { PlanoForm } from "@/components/planos/plano-form";

export default async function EditarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [plano, salas] = await Promise.all([getPlano(id), listSalas()]);

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
        salas={salas}
        defaultValues={{
          nome: plano.nome,
          descricao: plano.descricao ?? "",
          tipos: plano.tipos,
          atendimentos: String(plano.atendimentos),
          creditosRemarcacao: String(plano.creditosRemarcacao),
          permiteParcelamentoEstendido: plano.permiteParcelamentoEstendido,
          valores: {
            valorAVistaMensal: plano.valorAVistaMensal.toFixed(2).replace(".", ","),
            valorAVistaTrimestral: plano.valorAVistaTrimestral
              .toFixed(2)
              .replace(".", ","),
            valorAte3xTrimestral: plano.valorAte3xTrimestral
              .toFixed(2)
              .replace(".", ","),
          },
          salas: plano.salas.map((s) => ({
            salaId: s.salaId,
            descricao: s.descricao ?? "",
          })),
        }}
        mode="edit"
      />
    </div>
  );
}
