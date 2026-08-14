import { createPaciente } from "@/actions/pacientes";
import { PacienteForm } from "@/components/pacientes/paciente-form";

export default function NovoPacientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo paciente</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os dados e o histórico clínico do paciente.
        </p>
      </div>
      <PacienteForm action={createPaciente} mode="create" />
    </div>
  );
}
