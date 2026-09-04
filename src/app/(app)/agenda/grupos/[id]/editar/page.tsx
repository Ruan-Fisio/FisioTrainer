import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGrupoPaciente, updateGrupoPaciente } from "@/actions/grupos-pacientes";
import { GrupoPacienteForm } from "@/components/grupos-pacientes/grupo-paciente-form";

export default async function EditarGrupoPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [grupo, pacientes] = await Promise.all([
    getGrupoPaciente(id),
    prisma.paciente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  if (!grupo) notFound();

  const updateGrupoPacienteWithId = updateGrupoPaciente.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar grupo</h1>
        <p className="text-sm text-muted-foreground">Atualize os dados de {grupo.nome}.</p>
      </div>
      <GrupoPacienteForm
        action={updateGrupoPacienteWithId}
        pacienteOptions={pacientes}
        defaultValues={{ nome: grupo.nome, pacienteIds: grupo.pacientes.map((p) => p.id) }}
        mode="edit"
      />
    </div>
  );
}
