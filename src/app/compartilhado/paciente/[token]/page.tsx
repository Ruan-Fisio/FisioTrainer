import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { PacienteTabs } from "@/components/pacientes/paciente-tabs";
import { AvaliacoesPublicas } from "@/components/compartilhado/avaliacoes-publicas";
import { EvolucoesPublicas } from "@/components/compartilhado/evolucoes-publicas";
import { PlanoAtribuicoesList } from "@/components/plano-atribuicoes/plano-atribuicoes-list";
import { PlanosFinanceiroPublico } from "@/components/compartilhado/planos-financeiro-publico";
import { PacienteAgendamentosTab } from "@/components/pacientes/paciente-agendamentos-tab";
import { TreinoCompartilhadoView } from "@/app/compartilhado/treinos/[pacienteId]/treino-compartilhado-view";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ClipboardList,
  Dumbbell,
  FileText,
  Package,
  Paperclip,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { resolverPacientePorToken } from "@/lib/acesso-compartilhado";
import { listarAnexosComUrls } from "@/lib/paciente-anexos";
import { listarDocumentosDoPaciente } from "@/lib/documentos-paciente";
import { DocumentosPublicos } from "@/components/compartilhado/documentos-publicos";
import { AnexosPaciente } from "@/components/pacientes/anexos-paciente";
import {
  confirmarAnexoPortal,
  removerAnexoPortal,
  solicitarUploadAnexoPortal,
} from "@/actions/portal-anexos";
import { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";
import { getEvolucoesByPaciente } from "@/actions/evolucoes";
import { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";
import { getCobrancasByPaciente } from "@/actions/cobrancas";
import { getConsumoPlanoPaciente } from "@/actions/agendamentos";
import { materializarGradesPaciente } from "@/actions/grade-recorrente";
import { anoMesBrasilia } from "@/lib/datas-brasilia";
import { comAcessoPortal } from "@/lib/sessao";
import { AcoesPortalProvider } from "@/components/compartilhado/acoes-portal";
import {
  portalCriarAgendamentoAssistido,
  portalDesmarcarAgendamento,
  portalGetConsumoPlanoPaciente,
  portalGetDadosAgendamentoAssistido,
  portalGetDisponibilidadeHorarios,
  portalGetDisponibilidadeMesAssistido,
} from "@/actions/portal-agendamentos";

async function AvaliacoesLoader({
  pacienteId,
  token,
}: {
  pacienteId: string;
  token: string;
}) {
  const avaliacoes = await comAcessoPortal(pacienteId, () => getAvaliacoesByPaciente(pacienteId));
  return <AvaliacoesPublicas token={token} avaliacoes={avaliacoes} />;
}

/** O paciente vê e gerencia só o que ele mesmo enviou (a clínica vê tudo). */
async function AnexosLoader({
  pacienteId,
  token,
}: {
  pacienteId: string;
  token: string;
}) {
  const anexos = await listarAnexosComUrls(pacienteId, { origem: "PACIENTE" });
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Envie seus exames, laudos e fotos para a clínica. Só você e a equipe
          têm acesso.
        </p>
        <AnexosPaciente
          anexos={anexos}
          solicitarUpload={solicitarUploadAnexoPortal.bind(null, token)}
          confirmar={confirmarAnexoPortal.bind(null, token)}
          remover={removerAnexoPortal.bind(null, token)}
          permitirExcluir
          vazio="Você ainda não enviou nenhum arquivo."
        />
      </CardContent>
    </Card>
  );
}

/** Todo documento emitido pela clínica aparece no portal (decisão da clínica). */
async function DocumentosLoader({ pacienteId, token }: { pacienteId: string; token: string }) {
  const documentos = await listarDocumentosDoPaciente(pacienteId);
  return <DocumentosPublicos token={token} documentos={documentos} />;
}

async function EvolucoesLoader({ pacienteId }: { pacienteId: string }) {
  const evolucoes = await comAcessoPortal(pacienteId, () => getEvolucoesByPaciente(pacienteId));
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
  const atribuicoes = await comAcessoPortal(pacienteId, () =>
    listPlanoAtribuicoesByPaciente(pacienteId),
  );
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
  token,
}: {
  pacienteId: string;
  token: string;
}) {
  const [atribuicoes, cobrancas] = await comAcessoPortal(pacienteId, () =>
    Promise.all([listPlanoAtribuicoesByPaciente(pacienteId), getCobrancasByPaciente(pacienteId)]),
  );
  return (
    <PlanosFinanceiroPublico
      token={token}
      atribuicoes={atribuicoes}
      cobrancas={cobrancas}
    />
  );
}

async function AgendamentosLoader({ pacienteId, token }: { pacienteId: string; token: string }) {
  const { ano, mes } = anoMesBrasilia();
  const consumo = await comAcessoPortal(pacienteId, async () => {
    await materializarGradesPaciente(pacienteId);
    return getConsumoPlanoPaciente(pacienteId, ano, mes);
  });
  // Portal do paciente nunca vê os créditos de remarcação — zerar antes de enviar ao client.
  const resumo = consumo.map((plano) => ({
    ...plano,
    creditos: { max: 0, usados: 0, disponiveis: 0 },
  }));
  // O navegador chama estas actions (trocar mês, agendar, desmarcar): versões presas ao
  // token, que derivam o paciente do link no servidor.
  return (
    <AcoesPortalProvider
      acoes={{
        getConsumoPlanoPaciente: portalGetConsumoPlanoPaciente.bind(null, token),
        desmarcarAgendamentoPeloPaciente: portalDesmarcarAgendamento.bind(null, token),
        getDadosAgendamentoAssistido: portalGetDadosAgendamentoAssistido.bind(null, token),
        getDisponibilidadeMesAssistido: portalGetDisponibilidadeMesAssistido.bind(null, token),
        getDisponibilidadeHorarios: portalGetDisponibilidadeHorarios.bind(null, token),
        criarAgendamentoAssistido: portalCriarAgendamentoAssistido.bind(null, token),
      }}
    >
      <PacienteAgendamentosTab
        pacienteId={pacienteId}
        resumoInicial={resumo}
        anoInicial={ano}
        mesInicial={mes}
        somenteLeitura
      />
    </AcoesPortalProvider>
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
          Acompanhe suas avaliações, evoluções, documentos, treinos, planos e financeiro, e envie seus exames.
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
                <AvaliacoesLoader pacienteId={pacienteId} token={token} />
              </Suspense>
            ),
          },
          {
            value: "anexos",
            label: "Anexos",
            icon: <Paperclip />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <AnexosLoader pacienteId={pacienteId} token={token} />
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
            value: "documentos",
            label: "Documentos",
            icon: <FileText />,
            content: (
              <Suspense fallback={<TableSkeleton />}>
                <DocumentosLoader pacienteId={pacienteId} token={token} />
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
                <AgendamentosLoader pacienteId={pacienteId} token={token} />
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
                  token={token}
                />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
