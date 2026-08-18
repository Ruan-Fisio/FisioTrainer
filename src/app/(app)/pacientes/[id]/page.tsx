import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AvaliacoesList } from "@/components/exame-execucoes/avaliacoes-list";
import { EvolucoesList } from "@/components/evolucoes/evolucoes-list";
import { PacienteCobrancasList } from "@/components/cobrancas/paciente-cobrancas-list";
import { PlanoAtribuicoesList } from "@/components/plano-atribuicoes/plano-atribuicoes-list";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";
import { getEvolucoesByPaciente } from "@/actions/evolucoes";
import { getCobrancasByPaciente } from "@/actions/cobrancas";
import { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";
import { HistoricoClinicoDialog } from "@/components/pacientes/historico-clinico-dialog";
import { PacienteTabs } from "@/components/pacientes/paciente-tabs";

async function AvaliacoesListLoader({ pacienteId }: { pacienteId: string }) {
  const avaliacoes = await getAvaliacoesByPaciente(pacienteId);
  return <AvaliacoesList pacienteId={pacienteId} avaliacoes={avaliacoes} />;
}

async function EvolucoesListLoader({ pacienteId }: { pacienteId: string }) {
  const evolucoes = await getEvolucoesByPaciente(pacienteId);
  return <EvolucoesList pacienteId={pacienteId} evolucoes={evolucoes} />;
}

async function FinanceiroLoader({ pacienteId }: { pacienteId: string }) {
  const [atribuicoes, cobrancas] = await Promise.all([
    listPlanoAtribuicoesByPaciente(pacienteId),
    getCobrancasByPaciente(pacienteId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PlanoAtribuicoesList atribuicoes={atribuicoes} pacienteId={pacienteId} />
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Cobranças</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/pacientes/${pacienteId}/cobrancas/novo`}>
              <Plus />
              Cobrança avulsa
            </Link>
          </Button>
        </div>
        <PacienteCobrancasList pacienteId={pacienteId} cobrancas={cobrancas} />
      </div>
    </div>
  );
}

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paciente = await prisma.paciente.findUnique({ where: { id } });

  if (!paciente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{paciente.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {[
              paciente.idade != null ? `${paciente.idade} anos` : null,
              paciente.dataNascimento
                ? new Intl.DateTimeFormat("pt-BR").format(paciente.dataNascimento)
                : null,
              paciente.cpf,
              paciente.contato,
              paciente.endereco,
            ]
              .filter(Boolean)
              .join(" · ") || "Sem dados de contato cadastrados"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HistoricoClinicoDialog paciente={paciente} />
          <Button asChild variant="outline">
            <Link href={`/pacientes/${id}/editar`}>
              <Pencil />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <PacienteTabs
        defaultValue="avaliacoes"
        tabs={[
          {
            value: "avaliacoes",
            label: "Avaliações",
            action: (
              <Button asChild size="sm">
                <Link href={`/pacientes/${id}/exames/novo`}>
                  <Plus />
                  Nova avaliação
                </Link>
              </Button>
            ),
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <AvaliacoesListLoader pacienteId={id} />
              </Suspense>
            ),
          },
          {
            value: "evolucoes",
            label: "Evoluções",
            action: (
              <Button asChild size="sm">
                <Link href={`/pacientes/${id}/evolucoes/novo`}>
                  <Plus />
                  Nova evolução
                </Link>
              </Button>
            ),
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <EvolucoesListLoader pacienteId={id} />
              </Suspense>
            ),
          },
          {
            value: "financeiro",
            label: "Financeiro",
            action: (
              <Button asChild size="sm">
                <Link href={`/pacientes/${id}/planos/novo`}>
                  <Plus />
                  Atribuir plano
                </Link>
              </Button>
            ),
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <FinanceiroLoader pacienteId={id} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
