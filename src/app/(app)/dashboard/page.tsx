import { Wallet, CalendarDays } from "lucide-react";
import { PacienteTabs as PageTabs } from "@/components/pacientes/paciente-tabs";
import { AgendaResumoCard } from "@/components/dashboard/agenda-resumo-card";
import { AnaliseFinanceira } from "@/components/dashboard/analise-financeira";
import {
  getAnaliseFinanceira,
  getContagensAgenda,
  getProximosAgendamentos,
} from "@/actions/dashboard";

export default async function DashboardPage() {
  const [proximos, contagens, financeiro] = await Promise.all([
    getProximosAgendamentos(),
    getContagensAgenda(),
    getAnaliseFinanceira(),
  ]);

  const { atrasadas, ...analise } = financeiro;

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
              <AnaliseFinanceira analise={analise} atrasadas={atrasadas} />
            ),
          },
        ]}
      />
    </div>
  );
}
