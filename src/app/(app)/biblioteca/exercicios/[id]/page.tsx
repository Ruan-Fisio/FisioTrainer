import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkPreviewGrid } from "@/components/exercicios/link-preview-grid";

export default async function ExercicioDetailPage({
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <Button asChild variant="outline">
          <Link href={`/biblioteca/exercicios/${id}/editar`}>
            <Pencil />
            Editar
          </Link>
        </Button>
      </div>

      {exercicio.links.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum link cadastrado para este exercício.
        </p>
      ) : (
        <LinkPreviewGrid urls={exercicio.links.map((l) => l.url)} />
      )}
    </div>
  );
}
