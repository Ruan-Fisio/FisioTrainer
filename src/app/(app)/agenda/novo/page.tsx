import { prisma } from "@/lib/prisma";
import { createAgendamento } from "@/actions/agendamentos";
import { AgendamentoForm } from "@/components/agendamentos/agendamento-form";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ pacienteId?: string }>;
}) {
  const { pacienteId } = await searchParams;

  const pacientes = await prisma.paciente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Agende o retorno, a reavaliação ou a sessão do paciente.
        </p>
      </div>
      <AgendamentoForm
        action={createAgendamento}
        pacientes={pacientes}
        defaultValues={
          pacienteId
            ? {
                pacienteId,
                data: "",
                hora: "",
                tipo: "RETORNO",
                status: "AGENDADO",
                observacao: "",
              }
            : undefined
        }
        cancelHref={pacienteId ? `/pacientes/${pacienteId}` : "/agenda"}
        mode="create"
      />
    </div>
  );
}
