import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createPlanoAtribuicao } from "@/actions/plano-atribuicoes";
import { listPlanosDisponiveis } from "@/actions/planos";
import { getGradeRecorrenteOpcoes } from "@/actions/grade-recorrente";
import { getTaxaParcelamentoCartao } from "@/actions/configuracao-financeira";
import { PlanoAtribuicaoForm } from "@/components/plano-atribuicoes/plano-atribuicao-form";

export default async function NovaAtribuicaoPlanoPage({
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

  const [planosAtivos, gradeOpcoes, taxaParcelamentoCartao] = await Promise.all([
    listPlanosDisponiveis(),
    getGradeRecorrenteOpcoes(),
    getTaxaParcelamentoCartao(),
  ]);
  const createPlanoAtribuicaoWithPaciente = createPlanoAtribuicao.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Atribuir plano</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um plano do catálogo para gerar as cobranças de {paciente.nome}.
        </p>
      </div>
      <PlanoAtribuicaoForm
        action={createPlanoAtribuicaoWithPaciente}
        planosAtivos={planosAtivos}
        pacienteId={id}
        mode="create"
        gradeOpcoes={gradeOpcoes}
        taxaParcelamentoCartao={taxaParcelamentoCartao}
      />
    </div>
  );
}
