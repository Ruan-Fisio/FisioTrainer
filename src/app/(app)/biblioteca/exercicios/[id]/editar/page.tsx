import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateExercicio } from "@/actions/exercicios";
import { listAllCategorias } from "@/actions/categorias";
import { ExercicioForm } from "@/components/exercicios/exercicio-form";

export default async function EditarExercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [exercicio, categorias] = await Promise.all([
    prisma.exercicio.findUnique({
      where: { id },
      include: {
        categorias: { select: { id: true } },
        links: { select: { url: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    listAllCategorias(),
  ]);

  if (!exercicio) notFound();

  const updateExercicioWithId = updateExercicio.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar exercício</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {exercicio.name}.
        </p>
      </div>
      <ExercicioForm
        action={updateExercicioWithId}
        categoriaOptions={categorias}
        defaultValues={{
          name: exercicio.name,
          categoriaIds: exercicio.categorias.map((c) => c.id),
          links: exercicio.links.map((l) => l.url),
        }}
        mode="edit"
      />
    </div>
  );
}
