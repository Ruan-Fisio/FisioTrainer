import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateEvolucao } from "@/actions/evolucoes";
import { EvolucaoForm } from "@/components/evolucoes/evolucao-form";

export default async function EditarEvolucaoPage({
  params,
}: {
  params: Promise<{ id: string; evolucaoId: string }>;
}) {
  const { id, evolucaoId } = await params;

  const evolucao = await prisma.evolucao.findUnique({
    where: { id: evolucaoId },
  });

  if (!evolucao || evolucao.pacienteId !== id) notFound();

  const updateEvolucaoWithId = updateEvolucao.bind(null, evolucaoId, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar evolução</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados desta evolução.
        </p>
      </div>
      <EvolucaoForm
        action={updateEvolucaoWithId}
        defaultValues={{
          hdp: evolucao.hdp,
          hda: evolucao.hda,
          pa: evolucao.pa,
          fc: evolucao.fc,
          spo2: evolucao.spo2,
          fr: evolucao.fr,
          temperatura: evolucao.temperatura,
          evolucao: evolucao.evolucao,
          conduta: evolucao.conduta,
        }}
        pacienteId={id}
        mode="edit"
      />
    </div>
  );
}
