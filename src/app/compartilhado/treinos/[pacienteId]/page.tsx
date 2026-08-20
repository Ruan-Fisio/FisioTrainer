import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIAS_SEMANA,
  DIA_SEMANA_LABELS_CURTO,
  DIA_SEMANA_LABELS,
  formatarCarga,
  formatarDescanso,
} from "@/lib/dia-semana";
import { ExercicioLinkEmbed } from "@/components/exercicios/exercicio-link-embed";

export default async function TreinosCompartilhadoPage({
  params,
}: {
  params: Promise<{ pacienteId: string }>;
}) {
  const { pacienteId } = await params;

  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true, nome: true },
  });

  if (!paciente) notFound();

  const treinos = await prisma.treino.findMany({
    where: { pacienteId, ativo: true },
    orderBy: { createdAt: "desc" },
    include: {
      dias: {
        orderBy: { ordem: "asc" },
        include: {
          exercicios: {
            orderBy: { ordem: "asc" },
            include: {
              exercicio: { select: { id: true, name: true, links: true } },
            },
          },
        },
      },
    },
  });

  const diasComExercicios = DIAS_SEMANA.filter((dia) =>
    treinos.some((treino) => treino.dias.some((d) => d.diaSemana === dia)),
  );

  return (
    <div className="flex min-h-svh justify-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={523}
            height={342}
            className="h-auto w-[180px] object-contain"
            priority
          />
          <div className="text-center">
            <h1 className="text-2xl font-semibold">{paciente.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {treinos.length} treino{treinos.length !== 1 ? "s" : ""} ativo
              {treinos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {treinos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum treino ativo no momento.
            </CardContent>
          </Card>
        ) : diasComExercicios.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum exercício cadastrado nos treinos ativos.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={diasComExercicios[0]} className="gap-4">
            <div className="-mx-4 overflow-x-auto px-4">
              <TabsList className="w-max">
                {diasComExercicios.map((dia) => (
                  <TabsTrigger key={dia} value={dia} className="flex-none whitespace-nowrap">
                    {DIA_SEMANA_LABELS_CURTO[dia]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {diasComExercicios.map((dia) => (
              <TabsContent key={dia} value={dia} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">{DIA_SEMANA_LABELS[dia]}</h2>
                {treinos.map((treino) => {
                  const diaTreino = treino.dias.find((d) => d.diaSemana === dia);
                  if (!diaTreino || diaTreino.exercicios.length === 0) return null;

                  return (
                    <Card key={treino.id}>
                      <CardContent className="flex flex-col gap-3 p-4">
                        <div>
                          <p className="font-medium">{treino.nome}</p>
                          {treino.descricao && (
                            <p className="text-xs text-muted-foreground">
                              {treino.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          {diaTreino.exercicios.map((exercicio) => (
                            <div
                              key={exercicio.id}
                              className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3"
                            >
                              <span className="font-medium">
                                {exercicio.exercicio.name}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {exercicio.series && (
                                  <Badge variant="secondary">
                                    {exercicio.series} séries
                                  </Badge>
                                )}
                                {exercicio.repeticoes && (
                                  <Badge variant="secondary">
                                    {exercicio.repeticoes} reps
                                  </Badge>
                                )}
                                {exercicio.carga && (
                                  <Badge variant="secondary">
                                    {formatarCarga(exercicio.carga.toString())}
                                  </Badge>
                                )}
                                {exercicio.descanso && (
                                  <Badge variant="secondary">
                                    {formatarDescanso(exercicio.descanso)}
                                  </Badge>
                                )}
                              </div>
                              {exercicio.instrucoes && (
                                <p className="text-sm text-muted-foreground">
                                  {exercicio.instrucoes}
                                </p>
                              )}
                              {exercicio.exercicio.links.length > 0 && (
                                <div className="flex flex-col gap-2 pt-1">
                                  {exercicio.exercicio.links.map((link) => (
                                    <ExercicioLinkEmbed key={link.id} url={link.url} />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
