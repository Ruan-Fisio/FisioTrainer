import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateUsuario } from "@/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  });

  if (!usuario) notFound();

  const updateUsuarioWithId = updateUsuario.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar usuário</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {usuario.name}.
        </p>
      </div>
      <UsuarioForm
        action={updateUsuarioWithId}
        defaultValues={usuario}
        mode="edit"
      />
    </div>
  );
}
