import { Suspense } from "react";
import { Wallet, CalendarDays, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PacienteTabs as PageTabs } from "@/components/pacientes/paciente-tabs";
import { AgendaResumoCard } from "@/components/dashboard/agenda-resumo-card";
import { AnaliseFinanceira } from "@/components/dashboard/analise-financeira";
import { DespesasTab } from "@/components/despesas/despesas-tab";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { listSalas } from "@/actions/salas";
import { listAllServicos } from "@/actions/servicos";
import {
  getAnaliseFinanceira,
  getContagensAgenda,
  getProximosAgendamentos,
} from "@/actions/dashboard";
import { parseFiltrosDespesas } from "@/lib/despesas";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    categorias?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const filtrosDespesas = parseFiltrosDespesas(params);
  const paginaDespesas = Math.max(1, Number(params.page) || 1);

  const [proximos, contagens, financeiro, profissionais, salas, servicos] = await Promise.all([
    getProximosAgendamentos(),
    getContagensAgenda(),
    getAnaliseFinanceira(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listSalas(),
    listAllServicos(),
  ]);

  const { atrasadas, comparativo, ...analise } = financeiro;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da sua clínica.
        </p>
      </div>

      <PageTabs
        defaultValue="agenda"
        tabs={[
          {
            value: "agenda",
            label: "Agenda",
            icon: <CalendarDays />,
            content: (
              <AgendaResumoCard
                key={proximos
                  .map((a) => `${a.id}:${a.status}:${a.dataInicio.getTime()}`)
                  .join("|")}
                agendamentosIniciais={proximos}
                contagens={contagens}
                profissionais={profissionais.map((p) => ({ id: p.id, label: p.name ?? "Sem nome" }))}
                salas={salas.map((s) => ({ id: s.id, label: s.nome }))}
                servicos={servicos.map((s) => ({ id: s.id, label: s.nome }))}
              />
            ),
          },
          {
            value: "financeiro",
            label: "Financeiro",
            icon: <Wallet />,
            content: (
              <AnaliseFinanceira
                analise={analise}
                atrasadas={atrasadas}
                comparativo={comparativo}
              />
            ),
          },
          {
            value: "despesas",
            label: "Despesas",
            icon: <Receipt />,
            content: (
              <Suspense key={filtrosDespesas.mes} fallback={<TableSkeleton />}>
                <DespesasTab filtros={filtrosDespesas} page={paginaDespesas} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
