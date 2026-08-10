import { createUsuario } from "@/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";

export default function NovoUsuarioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo usuário</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo usuário com acesso à aplicação.
        </p>
      </div>
      <UsuarioForm action={createUsuario} mode="create" />
    </div>
  );
}
