import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgendamento, updateAgendamento } from "@/actions/agendamentos";
import { AgendamentoForm } from "@/components/agendamentos/agendamento-form";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";

export default async function EditarAgendamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [agendamento, pacientes] = await Promise.all([
    getAgendamento(id),
    prisma.paciente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  if (!agendamento) notFound();

  const updateAgendamentoWithId = updateAgendamento.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Atualize a data, o horário ou o status deste agendamento.
        </p>
      </div>
      <AgendamentoForm
        action={updateAgendamentoWithId}
        pacientes={pacientes}
        defaultValues={{
          pacienteId: agendamento.pacienteId,
          data: toDateInputValue(agendamento.dataHora),
          hora: toTimeInputValue(agendamento.dataHora),
          tipo: agendamento.tipo,
          status: agendamento.status,
          observacao: agendamento.observacao ?? "",
        }}
        cancelHref="/agenda"
        mode="edit"
      />
    </div>
  );
}
