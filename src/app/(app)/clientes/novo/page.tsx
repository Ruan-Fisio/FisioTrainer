import { createCliente } from "@/actions/clientes";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os dados e o histórico clínico do cliente.
        </p>
      </div>
      <ClienteForm action={createCliente} mode="create" />
    </div>
  );
}
