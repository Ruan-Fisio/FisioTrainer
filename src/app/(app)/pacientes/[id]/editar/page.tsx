import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePaciente } from "@/actions/pacientes";
import { PacienteForm } from "@/components/pacientes/paciente-form";

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({ where: { id } });

  if (!paciente) notFound();

  const updatePacienteWithId = updatePaciente.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar paciente</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {paciente.nome}.
        </p>
      </div>
      <PacienteForm
        action={updatePacienteWithId}
        defaultValues={paciente}
        mode="edit"
      />
    </div>
  );
}
