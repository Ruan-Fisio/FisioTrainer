import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCliente } from "@/actions/clientes";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) notFound();

  const updateClienteWithId = updateCliente.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar cliente</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {cliente.nome}.
        </p>
      </div>
      <ClienteForm
        action={updateClienteWithId}
        defaultValues={cliente}
        mode="edit"
      />
    </div>
  );
}
