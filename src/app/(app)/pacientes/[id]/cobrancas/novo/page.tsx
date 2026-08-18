import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createCobranca } from "@/actions/cobrancas";
import { CobrancaForm } from "@/components/cobrancas/cobranca-form";

export default async function NovaCobrancaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: { nome: true },
  });

  if (!paciente) notFound();

  const createCobrancaComPaciente = createCobranca.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova cobrança</h1>
        <p className="text-sm text-muted-foreground">
          Registre uma cobrança avulsa para {paciente.nome}.
        </p>
      </div>
      <CobrancaForm
        action={createCobrancaComPaciente}
        defaultValues={{
          planoNome: "",
          valor: "",
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
