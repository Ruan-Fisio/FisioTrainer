import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createMensalidade } from "@/actions/mensalidades";
import { MensalidadeForm } from "@/components/mensalidades/mensalidade-form";

export default async function NovaMensalidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: { nome: true, planoNome: true, planoValor: true },
  });

  if (!paciente) notFound();

  const createMensalidadeWithPaciente = createMensalidade.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova mensalidade</h1>
        <p className="text-sm text-muted-foreground">
          Registre a mensalidade do plano de {paciente.nome}.
        </p>
      </div>
      <MensalidadeForm
        action={createMensalidadeWithPaciente}
        defaultValues={{
          planoNome: paciente.planoNome ?? "",
          valor:
            paciente.planoValor != null
              ? Number(paciente.planoValor).toFixed(2).replace(".", ",")
              : "",
          vencimento: "",
          status: "PENDENTE",
          observacao: "",
        }}
        pacienteId={id}
        mode="create"
      />
    </div>
  );
}
