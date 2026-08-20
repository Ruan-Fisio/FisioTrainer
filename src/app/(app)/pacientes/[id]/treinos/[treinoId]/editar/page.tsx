import { notFound } from "next/navigation";
import { getTreinoPaciente, updateTreinoPaciente } from "@/actions/treinos-paciente";
import { prisma } from "@/lib/prisma";
import { TreinoForm } from "@/components/treinos/treino-form";

export default async function EditarTreinoPacientePage({
  params,
}: {
  params: Promise<{ id: string; treinoId: string }>;
}) {
  const { id, treinoId } = await params;

  const [treino, exercicios] = await Promise.all([
    getTreinoPaciente(treinoId, id),
    prisma.exercicio.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, links: { select: { id: true, url: true } } },
    }),
  ]);

  if (!treino) notFound();

  const updateTreinoPacienteWithId = updateTreinoPaciente.bind(null, treinoId, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar treino do paciente</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {treino.nome}. Alterações aqui não afetam o
          modelo de origem na biblioteca.
        </p>
      </div>
      <TreinoForm
        action={updateTreinoPacienteWithId}
        exercicioOptions={exercicios}
        mode="edit"
        backHref={`/pacientes/${id}/treinos`}
        submitLabel="Salvar alterações"
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
