import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  NotebookPen,
  CalendarClock,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDashboardStats,
  getProximosAgendamentos,
  getResumoFinanceiro,
} from "@/actions/dashboard";
import { TIPO_AGENDAMENTO_LABEL } from "@/components/agendamentos/agendamento-labels";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";

export default async function DashboardPage() {
  const [stats, proximos, financeiro] = await Promise.all([
    getDashboardStats(),
    getProximosAgendamentos(),
    getResumoFinanceiro(),
  ]);

  const kpis = [
    { label: "Pacientes Cadastrados", value: String(stats.pacientes), icon: Users },
    {
      label: "Avaliações Realizadas",
      value: String(stats.avaliacoes),
      icon: ClipboardCheck,
    },
    {
      label: "Evoluções Cadastradas",
      value: String(stats.evolucoes),
      icon: NotebookPen,
    },
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-muted-foreground" />
              Próximos retornos e reavaliações
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {proximos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum retorno agendado.
              </p>
            ) : (
              proximos.map((agendamento) => (
                <Link
                  key={agendamento.id}
                  href={`/pacientes/${agendamento.pacienteId}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {agendamento.paciente.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatarDataHora(agendamento.dataHora)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
