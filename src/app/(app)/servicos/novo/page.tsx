import { createServico } from "@/actions/servicos";
import { listSalas } from "@/actions/salas";
import { listAllUsuarios } from "@/actions/usuarios";
import { ServicoForm } from "@/components/servicos/servico-form";

export default async function NovoServicoPage() {
  const [salas, usuarios] = await Promise.all([listSalas(), listAllUsuarios()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo serviço</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo serviço para agendamento manual avulso.
        </p>
      </div>
      <ServicoForm action={createServico} mode="create" salas={salas} usuarios={usuarios} />
    </div>
  );
}
