import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCategoria } from "@/actions/categorias";
import { CategoriaForm } from "@/components/categorias/categoria-form";

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const categoria = await prisma.categoria.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!categoria) notFound();

  const updateCategoriaWithId = updateCategoria.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar categoria</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {categoria.name}.
        </p>
      </div>
      <CategoriaForm
        action={updateCategoriaWithId}
        defaultValues={categoria}
        mode="edit"
      />
    </div>
  );
}
