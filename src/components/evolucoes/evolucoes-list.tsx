import Link from "next/link";
import { ChevronRight, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { getEvolucoesByPaciente } from "@/actions/evolucoes";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

type Evolucao = Awaited<ReturnType<typeof getEvolucoesByPaciente>>[number];

export function EvolucoesList({
  pacienteId,
  evolucoes,
}: {
  pacienteId: string;
  evolucoes: Evolucao[];
}) {
  if (evolucoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma evolução registrada para este paciente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {evolucoes.map((evolucao) => (
        <Card key={evolucao.id} className="p-0">
          <Link
            href={`/pacientes/${pacienteId}/evolucoes/${evolucao.id}`}
            className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium">{formatarData(evolucao.data)}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Stethoscope className="size-3.5" />
                {evolucao.profissional.name}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Card>
      ))}
    </div>
  );
}
