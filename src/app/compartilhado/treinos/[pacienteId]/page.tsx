import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { TreinoCompartilhadoView } from "@/app/compartilhado/treinos/[pacienteId]/treino-compartilhado-view";

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

  const treinosSerializados = treinos.map((treino) => ({
    id: treino.id,
    nome: treino.nome,
    descricao: treino.descricao,
    dias: treino.dias.map((dia) => ({
      id: dia.id,
      diaSemana: dia.diaSemana,
      exercicios: dia.exercicios.map((exercicio) => ({
        id: exercicio.id,
        series: exercicio.series,
        repeticoes: exercicio.repeticoes,
        carga: exercicio.carga ? Number(exercicio.carga) : null,
        descanso: exercicio.descanso,
        instrucoes: exercicio.instrucoes,
        exercicio: exercicio.exercicio,
      })),
    })),
  }));

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
        ) : (
          <TreinoCompartilhadoView treinos={treinosSerializados} />
        )}
      </div>
    </div>
  );
}
