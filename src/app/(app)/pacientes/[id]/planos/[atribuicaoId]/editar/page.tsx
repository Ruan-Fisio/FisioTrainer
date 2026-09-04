import { notFound } from "next/navigation";
import {
  getPlanoAtribuicao,
  updatePlanoAtribuicao,
} from "@/actions/plano-atribuicoes";
import { listPlanosDisponiveis } from "@/actions/planos";
import { PlanoAtribuicaoForm } from "@/components/plano-atribuicoes/plano-atribuicao-form";
import { toDateInputValue } from "@/lib/format";

export default async function EditarAtribuicaoPlanoPage({
  params,
}: {
  params: Promise<{ id: string; atribuicaoId: string }>;
}) {
  const { id, atribuicaoId } = await params;

  const atribuicao = await getPlanoAtribuicao(atribuicaoId);

  if (!atribuicao || atribuicao.pacienteId !== id) notFound();

  const planosAtivos = await listPlanosDisponiveis();

  const cobrancasBase = atribuicao.cobrancas.filter(
    (c) => c.status === "PENDENTE",
  );
  const vencimentos = (
    cobrancasBase.length > 0 ? cobrancasBase : atribuicao.cobrancas
  ).map((c) => toDateInputValue(c.vencimento));

  const updatePlanoAtribuicaoWithId = updatePlanoAtribuicao.bind(
    null,
    atribuicaoId,
    id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar plano do paciente</h1>
        <p className="text-sm text-muted-foreground">
          Alterar o plano, o cartão ou as datas regenera as cobranças pendentes.
        </p>
      </div>
      <PlanoAtribuicaoForm
        action={updatePlanoAtribuicaoWithId}
        planosAtivos={planosAtivos}
        defaultValues={{
          planoId: atribuicao.planoId ?? "",
          formaPagamento: atribuicao.formaPagamento,
          periodicidade: atribuicao.periodicidade,
          vencimentos,
          descontoTipo: atribuicao.desconto > 0 ? "VALOR" : "NENHUM",
          descontoValor: atribuicao.desconto > 0 ? atribuicao.desconto : undefined,
        }}
        pacienteId={id}
        mode="edit"
      />
    </div>
  );
}
