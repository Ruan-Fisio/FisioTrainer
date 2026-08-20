import { notFound } from "next/navigation";
import { getTreino, updateTreino } from "@/actions/treinos";
import { prisma } from "@/lib/prisma";
import { TreinoForm } from "@/components/treinos/treino-form";

export default async function EditarTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [treino, exercicios] = await Promise.all([
    getTreino(id),
    prisma.exercicio.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, links: { select: { id: true, url: true } } },
    }),
  ]);

  if (!treino) notFound();

  const updateTreinoWithId = updateTreino.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar treino</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {treino.nome}.
        </p>
      </div>
      <TreinoForm
        action={updateTreinoWithId}
        exercicioOptions={exercicios}
        mode="edit"
        backHref={`/treinos/${id}`}
        defaultValues={{
          nome: treino.nome,
          descricao: treino.descricao ?? "",
          dias: treino.dias.map((dia) => ({
            id: dia.id,
            diaSemana: dia.diaSemana,
            exercicios: dia.exercicios.map((exercicio) => ({
              id: exercicio.id,
              exercicioId: exercicio.exercicioId,
              series: exercicio.series,
              repeticoes: exercicio.repeticoes,
              carga: exercicio.carga ? Number(exercicio.carga) : null,
              descanso: exercicio.descanso,
              instrucoes: exercicio.instrucoes,
            })),
          })),
        }}
      />
    </div>
  );
}
