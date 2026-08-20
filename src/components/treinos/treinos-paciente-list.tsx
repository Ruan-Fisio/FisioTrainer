import { Card, CardContent } from "@/components/ui/card";
import { TreinoPacienteCard } from "@/components/treinos/treino-paciente-card";
import type { listTreinosPaciente } from "@/actions/treinos-paciente";

export function TreinosPacienteList({
  treinos,
  pacienteId,
}: {
  treinos: Awaited<ReturnType<typeof listTreinosPaciente>>;
  pacienteId: string;
}) {
  if (treinos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum treino atribuído a este paciente no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {treinos.map((treino) => (
        <TreinoPacienteCard key={treino.id} treino={treino} pacienteId={pacienteId} />
      ))}
    </div>
  );
}
