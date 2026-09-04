import Link from "next/link";
import { Users, Wallet, AlertTriangle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PacienteTabs as PageTabs } from "@/components/pacientes/paciente-tabs";
import { AgendaResumoCard } from "@/components/dashboard/agenda-resumo-card";
import {
  getContagensAgenda,
  getProximosAgendamentos,
  getResumoFinanceiro,
} from "@/actions/dashboard";
import { formatarData, formatarMoeda } from "@/lib/format";

function KpiGrid({
  kpis,
}: {
  kpis: { label: string; value: string; icon: typeof Users }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [proximos, contagens, financeiro] = await Promise.all([
    getProximosAgendamentos(),
    getContagensAgenda(),
    getResumoFinanceiro(),
  ]);

  const kpisFinanceiro = [
    {
      label: "Recebido no Mês",
      value: formatarMoeda(financeiro.recebidoMes),
      icon: Wallet,
    },
    {
      label: "A Receber no Mês",
      value: formatarMoeda(financeiro.aReceberMes),
      icon: Wallet,
    },
    {
      label: "Em Atraso",
      value: formatarMoeda(financeiro.totalAtrasado),
      icon: AlertTriangle,
    },
  ];

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
              />
            ),
          },
          {
            value: "financeiro",
            label: "Financeiro",
            icon: <Wallet />,
            content: (
              <>
                <KpiGrid kpis={kpisFinanceiro} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-muted-foreground" />
                      Cobranças em atraso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {financeiro.atrasadas.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Nenhuma cobrança em atraso.
                      </p>
                    ) : (
                      financeiro.atrasadas.map((cobranca) => (
                        <Link
                          key={cobranca.id}
                          href={`/pacientes/${cobranca.pacienteId}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {cobranca.paciente.nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {cobranca.planoNome} · venceu em{" "}
                              {formatarData(cobranca.vencimento)}
                            </span>
                          </div>
                          <Badge variant="destructive">
                            {formatarMoeda(cobranca.valor)}
                          </Badge>
                        </Link>
                      ))
                    )}
                  </CardContent>
                </Card>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
