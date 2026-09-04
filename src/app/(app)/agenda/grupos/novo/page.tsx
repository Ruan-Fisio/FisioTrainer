import { prisma } from "@/lib/prisma";
import { createGrupoPaciente } from "@/actions/grupos-pacientes";
import { GrupoPacienteForm } from "@/components/grupos-pacientes/grupo-paciente-form";

export default async function NovoGrupoPacientePage() {
  const pacientes = await prisma.paciente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo grupo</h1>
        <p className="text-sm text-muted-foreground">
          Reúna pacientes que costumam ser agendados juntos.
        </p>
      </div>
      <GrupoPacienteForm action={createGrupoPaciente} pacienteOptions={pacientes} mode="create" />
    </div>
  );
}
