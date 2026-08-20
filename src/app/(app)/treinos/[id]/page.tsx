import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTreino } from "@/actions/treinos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DIA_SEMANA_LABELS,
  ordenarPorDiaSemana,
  formatarCarga,
  formatarDescanso,
} from "@/lib/dia-semana";
import { LinkPreviewCard } from "@/components/exercicios/link-preview-card";

export default async function TreinoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const treino = await getTreino(id);

  if (!treino) notFound();

  const dias = ordenarPorDiaSemana(treino.dias);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{treino.nome}</h1>
          {treino.descricao && (
            <p className="text-sm text-muted-foreground">{treino.descricao}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/treinos/${id}/editar`}>
            <Pencil />
            Editar
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {dias.map((dia) => (
          <div key={dia.id} className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              {DIA_SEMANA_LABELS[dia.diaSemana]}
            </Badge>
            <div className="flex flex-col gap-1 pl-1">
              {dia.exercicios.map((exercicio) => (
                <div
                  key={exercicio.id}
                  className="flex flex-col gap-0.5 border-l-2 border-muted pl-3 text-sm"
                >
                  <span className="font-medium">{exercicio.exercicio.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      exercicio.series ? `${exercicio.series} séries` : null,
                      exercicio.repeticoes ? `${exercicio.repeticoes} reps` : null,
                      formatarCarga(exercicio.carga?.toString()),
                      formatarDescanso(exercicio.descanso),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {exercicio.instrucoes && (
                    <span className="text-xs text-muted-foreground">
                      {exercicio.instrucoes}
                    </span>
                  )}
                  {exercicio.exercicio.links.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1">
                      {exercicio.exercicio.links.map((link) => (
                        <LinkPreviewCard key={link.id} url={link.url} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
