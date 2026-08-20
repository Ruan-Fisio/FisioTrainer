import { createTreino } from "@/actions/treinos";
import { prisma } from "@/lib/prisma";
import { TreinoForm } from "@/components/treinos/treino-form";

export default async function NovoTreinoPage() {
  const exercicios = await prisma.exercicio.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, links: { select: { id: true, url: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo treino</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo treino modelo na biblioteca.
        </p>
      </div>
      <TreinoForm
        action={createTreino}
        exercicioOptions={exercicios}
        mode="create"
        backHref="/treinos"
      />
    </div>
  );
}
