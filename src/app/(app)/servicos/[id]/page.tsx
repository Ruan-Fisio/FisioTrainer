import { notFound } from "next/navigation";
import { getServico, updateServico } from "@/actions/servicos";
import { listSalas } from "@/actions/salas";
import { listAllUsuarios } from "@/actions/usuarios";
import { ServicoForm } from "@/components/servicos/servico-form";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [servico, salas, usuarios] = await Promise.all([
    getServico(id),
    listSalas(),
    listAllUsuarios(),
  ]);

  if (!servico) notFound();

  const updateServicoWithId = updateServico.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar serviço</h1>
        <p className="text-sm text-muted-foreground">Atualize os dados de {servico.nome}.</p>
      </div>
      <ServicoForm
        action={updateServicoWithId}
        salas={salas}
        usuarios={usuarios}
        defaultValues={{
          nome: servico.nome,
          ativo: servico.ativo,
          salas: servico.salas.map((s) => ({
            salaId: s.salaId,
            capacidade: String(s.capacidade),
            descricao: s.descricao ?? "",
          })),
          profissionais: servico.profissionais.map((p) => p.usuarioId),
        }}
        mode="edit"
      />
    </div>
  );
}
