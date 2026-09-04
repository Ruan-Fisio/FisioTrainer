import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAgendamento, updateAgendamento } from "@/actions/agendamentos";
import { listGruposPacientesOptions } from "@/actions/grupos-pacientes";
import { AgendamentoForm } from "@/components/agendamentos/agendamento-form";
import { toDateInputValue, toTimeInputValue } from "@/lib/format";

export default async function EditarAgendamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [agendamento, pacientes, grupos, profissionais] = await Promise.all([
    getAgendamento(id),
    prisma.paciente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    listGruposPacientesOptions(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!agendamento) notFound();

  const updateAgendamentoWithId = updateAgendamento.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar evento</h1>
        <p className="text-sm text-muted-foreground">
          {agendamento.serieId
            ? "Esta alteração afeta apenas esta ocorrência da série."
            : "Atualize os dados deste evento."}
        </p>
      </div>
      <AgendamentoForm
        action={updateAgendamentoWithId}
        pacientes={pacientes}
        grupos={grupos}
        profissionais={profissionais}
        defaultValues={{
          titulo: agendamento.titulo,
          pacienteIds: agendamento.pacientes.map((p) => p.id),
          profissionalId: agendamento.profissionalId ?? "",
          data: toDateInputValue(agendamento.dataInicio),
          horaInicio: toTimeInputValue(agendamento.dataInicio),
          horaFim: toTimeInputValue(agendamento.dataFim),
          diaInteiro: agendamento.diaInteiro,
          modalidade: agendamento.modalidade,
          status: agendamento.status,
          observacao: agendamento.observacao ?? "",
        }}
        cancelHref="/agenda"
        mode="edit"
        agendamentoId={id}
      />
    </div>
  );
}
