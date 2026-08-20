import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreinoPacienteRowActions } from "@/components/treinos/treino-paciente-row-actions";
import {
  DIA_SEMANA_LABELS,
  ordenarPorDiaSemana,
  formatarCarga,
  formatarDescanso,
} from "@/lib/dia-semana";
import { LinkPreviewCard } from "@/components/exercicios/link-preview-card";
import type { listTreinosPaciente } from "@/actions/treinos-paciente";

type Treino = Awaited<ReturnType<typeof listTreinosPaciente>>[number];

export function TreinoPacienteCard({
  treino,
  pacienteId,
}: {
  treino: Treino;
  pacienteId: string;
}) {
  const dias = ordenarPorDiaSemana(treino.dias);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{treino.nome}</p>
            {treino.descricao && (
              <p className="text-sm text-muted-foreground">{treino.descricao}</p>
            )}
          </div>
          <TreinoPacienteRowActions
            id={treino.id}
            pacienteId={pacienteId}
            nome={treino.nome}
          />
        </div>

        <div className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
  );
}
