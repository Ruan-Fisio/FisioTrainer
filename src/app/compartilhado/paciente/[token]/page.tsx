import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { PacienteTabs } from "@/components/pacientes/paciente-tabs";
import { AvaliacoesPublicas } from "@/components/compartilhado/avaliacoes-publicas";
import { EvolucoesPublicas } from "@/components/compartilhado/evolucoes-publicas";
import { PlanoAtribuicoesList } from "@/components/plano-atribuicoes/plano-atribuicoes-list";
import { PacienteCobrancasList } from "@/components/cobrancas/paciente-cobrancas-list";
import { PacienteAgendamentosTab } from "@/components/pacientes/paciente-agendamentos-tab";
import { TreinoCompartilhadoView } from "@/app/compartilhado/treinos/[pacienteId]/treino-compartilhado-view";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ClipboardList,
  Dumbbell,
  Package,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { resolverPacientePorToken } from "@/lib/acesso-compartilhado";
import { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";
import { getEvolucoesByPaciente } from "@/actions/evolucoes";
import { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";
import { getCobrancasByPaciente } from "@/actions/cobrancas";
import { getConsumoPlanoPaciente } from "@/actions/agendamentos";

async function AvaliacoesLoader({ pacienteId }: { pacienteId: string }) {
  const avaliacoes = await getAvaliacoesByPaciente(pacienteId);
  return <AvaliacoesPublicas avaliacoes={avaliacoes} />;
}

async function EvolucoesLoader({ pacienteId }: { pacienteId: string }) {
  const evolucoes = await getEvolucoesByPaciente(pacienteId);
  return <EvolucoesPublicas evolucoes={evolucoes} />;
}

async function TreinosLoader({ pacienteId }: { pacienteId: string }) {
  const treinos = await prisma.treino.findMany({
    where: { pacienteId, ativo: true },
    orderBy: { createdAt: "desc" },
    include: {
      dias: {
        orderBy: { ordem: "asc" },
        include: {
          exercicios: {
            orderBy: { ordem: "asc" },
            include: {
              exercicio: { select: { id: true, name: true, links: true } },
            },
          },
        },
      },
    },
  });

  if (treinos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum treino ativo no momento.
        </CardContent>
      </Card>
    );
  }

  const treinosSerializados = treinos.map((treino) => ({
    id: treino.id,
    nome: treino.nome,
    descricao: treino.descricao,
    dias: treino.dias.map((dia) => ({
      id: dia.id,
      diaSemana: dia.diaSemana,
      exercicios: dia.exercicios.map((ex) => ({
        id: ex.id,
        series: ex.series,
        repeticoes: ex.repeticoes,
        carga: ex.carga ? Number(ex.carga) : null,
        descanso: ex.descanso,
        instrucoes: ex.instrucoes,
        exercicio: ex.exercicio,
      })),
    })),
  }));

  return <TreinoCompartilhadoView treinos={treinosSerializados} />;
}

async function PlanosLoader({ pacienteId }: { pacienteId: string }) {
  const atribuicoes = await listPlanoAtribuicoesByPaciente(pacienteId);
  return (
    <PlanoAtribuicoesList
      atribuicoes={atribuicoes}
      pacienteId={pacienteId}
      showActions={false}
    />
  );
}

async function FinanceiroLoader({
  pacienteId,
  pacienteNome,
}: {
  pacienteId: string;
  pacienteNome: string;
}) {
  const [atribuicoes, cobrancas] = await Promise.all([
    listPlanoAtribuicoesByPaciente(pacienteId),
    getCobrancasByPaciente(pacienteId),
  ]);
  return (
    <PacienteCobrancasList
      pacienteId={pacienteId}
      pacienteNome={pacienteNome}
      pacienteContato={null}
      cobrancas={cobrancas}
      atribuicoes={atribuicoes}
      cnpjPix={null}
      somenteLeitura
    />
  );
}

async function AgendamentosLoader({ pacienteId }: { pacienteId: string }) {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const resumo = await getConsumoPlanoPaciente(pacienteId, ano, mes);
  return (
    <PacienteAgendamentosTab
      pacienteId={pacienteId}
      resumoInicial={resumo}
      anoInicial={ano}
      mesInicial={mes}
      somenteLeitura
    />
  );
}

export default async function PortalPacientePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { pacienteId, paciente } = await resolverPacientePorToken(token);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{paciente.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas avaliações, evoluções, treinos, planos e financeiro.
        </p>
      </div>

      <PacienteTabs
        defaultValue="avaliacoes"
        tabs={[
          {
            value: "avaliacoes",
            label: "Avaliações",
            icon: <ClipboardList />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <AvaliacoesLoader pacienteId={pacienteId} />
              </Suspense>
            ),
          },
          {
            value: "evolucoes",
            label: "Evoluções",
            icon: <Stethoscope />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <EvolucoesLoader pacienteId={pacienteId} />
              </Suspense>
            ),
          },
          {
            value: "treinos",
            label: "Treinos",
            icon: <Dumbbell />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <TreinosLoader pacienteId={pacienteId} />
              </Suspense>
            ),
          },
          {
            value: "planos",
            label: "Planos",
            icon: <Package />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <PlanosLoader pacienteId={pacienteId} />
              </Suspense>
            ),
          },
          {
            value: "agendamentos",
            label: "Agendamentos",
            icon: <Calendar />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <AgendamentosLoader pacienteId={pacienteId} />
              </Suspense>
            ),
          },
          {
            value: "financeiro",
            label: "Financeiro",
            icon: <Wallet />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <FinanceiroLoader
                  pacienteId={pacienteId}
                  pacienteNome={paciente.nome}
                />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
