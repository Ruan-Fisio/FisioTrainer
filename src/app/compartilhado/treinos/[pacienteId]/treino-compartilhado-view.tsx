"use client";

import { useMemo, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Repeat,
  RotateCw,
  Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIAS_SEMANA,
  DIA_SEMANA_LABELS_CURTO,
  DIA_SEMANA_LABELS,
  formatarCarga,
  formatarDescanso,
} from "@/lib/dia-semana";
import { ExercicioLinkEmbed } from "@/components/exercicios/exercicio-link-embed";

type TreinoView = {
  id: string;
  nome: string;
  descricao: string | null;
  dias: {
    id: string;
    diaSemana: (typeof DIAS_SEMANA)[number];
    exercicios: {
      id: string;
      series: number | null;
      repeticoes: string | null;
      carga: number | null;
      descanso: number | null;
      instrucoes: string | null;
      exercicio: {
        id: string;
        name: string;
        links: { id: string; url: string }[];
      };
    }[];
  }[];
};

export function TreinoCompartilhadoView({
  treinos,
}: {
  treinos: TreinoView[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const treinoId = searchParams.get("treino");

  const treinoSelecionado = useMemo(
    () => treinos.find((t) => t.id === treinoId) ?? null,
    [treinos, treinoId],
  );

  function selecionarTreino(id: string) {
    router.push(`?treino=${id}`, { scroll: false });
  }

  function voltar() {
    router.push("?", { scroll: false });
  }

  if (!treinoSelecionado) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-center text-base font-medium text-muted-foreground">
          Selecione um treino
        </h2>
        {treinos.map((treino) => {
          const totalExercicios = treino.dias.reduce(
            (acc, dia) => acc + dia.exercicios.length,
            0,
          );
          return (
            <button
              key={treino.id}
              type="button"
              onClick={() => selecionarTreino(treino.id)}
              className="text-left"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Dumbbell className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{treino.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {treino.dias.length} dia
                        {treino.dias.length !== 1 ? "s" : ""} ·{" "}
                        {totalExercicios} exercício
                        {totalExercicios !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    );
  }

  const diasComExercicios = DIAS_SEMANA.filter((dia) =>
    treinoSelecionado.dias.some(
      (d) => d.diaSemana === dia && d.exercicios.length > 0,
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={voltar} className="shrink-0">
          <ChevronLeft className="size-5" />
          <span className="sr-only">Voltar</span>
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {treinoSelecionado.nome}
          </h2>
          {treinoSelecionado.descricao && (
            <p className="truncate text-xs text-muted-foreground">
              {treinoSelecionado.descricao}
            </p>
          )}
        </div>
      </div>

      {diasComExercicios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum exercício cadastrado neste treino.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={diasComExercicios[0]} className="gap-4">
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList className="w-max">
              {diasComExercicios.map((dia) => (
                <TabsTrigger
                  key={dia}
                  value={dia}
                  className="flex-none whitespace-nowrap"
                >
                  {DIA_SEMANA_LABELS_CURTO[dia]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {diasComExercicios.map((dia) => {
            const diaTreino = treinoSelecionado.dias.find(
              (d) => d.diaSemana === dia,
            );

            return (
              <TabsContent key={dia} value={dia} className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {DIA_SEMANA_LABELS[dia]}
                </h3>
                {diaTreino?.exercicios.map((exercicio, index) => (
                  <Card key={exercicio.id}>
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <p className="font-medium leading-tight">
                            {exercicio.exercicio.name}
                          </p>
                        </div>
                      </div>

                      {(exercicio.series ||
                        exercicio.repeticoes ||
                        exercicio.carga != null ||
                        exercicio.descanso != null) && (
                        <div className="grid grid-cols-4 divide-x rounded-md border bg-muted/30">
                          <StatTile
                            icon={Repeat}
                            label="Séries"
                            value={exercicio.series ?? "—"}
                          />
                          <StatTile
                            icon={RotateCw}
                            label="Reps"
                            value={exercicio.repeticoes ?? "—"}
                          />
                          <StatTile
                            icon={Dumbbell}
                            label="Carga"
                            value={formatarCarga(exercicio.carga) ?? "—"}
                          />
                          <StatTile
                            icon={Timer}
                            label="Descanso"
                            value={formatarDescanso(exercicio.descanso) ?? "—"}
                          />
                        </div>
                      )}

                      {exercicio.instrucoes && (
                        <p className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                          {exercicio.instrucoes}
                        </p>
                      )}

                      {exercicio.exercicio.links.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {exercicio.exercicio.links.map((link) => (
                            <ExercicioLinkEmbed key={link.id} url={link.url} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-2 text-center">
      <Icon className="size-4 text-primary" />
      <span className="text-sm font-semibold leading-none">{value}</span>
      <span className="text-[10px] leading-none text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
