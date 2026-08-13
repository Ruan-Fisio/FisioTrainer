import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateMovimento } from "@/actions/movimentos";
import { MovimentoForm } from "@/components/movimentos/movimento-form";

export default async function EditarMovimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const movimento = await prisma.movimento.findUnique({
    where: { id },
    select: { nome: true, grauIdeal: true },
  });

  if (!movimento) notFound();

  const updateMovimentoWithId = updateMovimento.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar movimento</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {movimento.nome}.
        </p>
      </div>
      <MovimentoForm
        action={updateMovimentoWithId}
        defaultValues={movimento}
        mode="edit"
      />
    </div>
  );
}
