import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { LinkPreviewGrid } from "@/components/exercicios/link-preview-grid";

export default async function ExercicioCompartilhadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exercicio = await prisma.exercicio.findUnique({
    where: { id },
    include: {
      categorias: { select: { id: true, name: true } },
      links: { select: { url: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!exercicio) notFound();

  return (
    <div className="flex min-h-svh justify-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
            FT
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            FisioTrainer
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{exercicio.name}</h1>
          <div className="flex flex-wrap gap-1">
            {exercicio.categorias.map((categoria) => (
              <Badge key={categoria.id} variant="secondary">
                {categoria.name}
              </Badge>
            ))}
          </div>
        </div>

        {exercicio.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum link cadastrado para este exercício.
          </p>
        ) : (
          <LinkPreviewGrid urls={exercicio.links.map((l) => l.url)} />
        )}
      </div>
    </div>
  );
}
