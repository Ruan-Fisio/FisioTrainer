import { prisma } from "@/lib/prisma";
import { createAgendamento } from "@/actions/agendamentos";
import { AgendamentoForm } from "@/components/agendamentos/agendamento-form";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ pacienteId?: string; data?: string; horaInicio?: string }>;
}) {
  const { pacienteId, data, horaInicio } = await searchParams;

  const [pacientes, profissionais] = await Promise.all([
    prisma.paciente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const temPrefill = Boolean(pacienteId || data || horaInicio);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo evento</h1>
        <p className="text-sm text-muted-foreground">
          Crie um compromisso na agenda, com ou sem paciente vinculado.
        </p>
      </div>
      <AgendamentoForm
        action={createAgendamento}
        pacientes={pacientes}
        profissionais={profissionais}
        defaultValues={
          temPrefill
            ? {
                titulo: "",
                pacienteIds: pacienteId ? [pacienteId] : [],
                profissionalId: "",
                data: data ?? "",
                horaInicio: horaInicio ?? "",
                horaFim: "",
                diaInteiro: false,
                modalidade: "FISIOTERAPIA",
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
