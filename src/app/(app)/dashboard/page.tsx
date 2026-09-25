import { Wallet, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PacienteTabs as PageTabs } from "@/components/pacientes/paciente-tabs";
import { AgendaResumoCard } from "@/components/dashboard/agenda-resumo-card";
import { AnaliseFinanceira } from "@/components/dashboard/analise-financeira";
import { listSalas } from "@/actions/salas";
import { listAllServicos } from "@/actions/servicos";
import {
  getAnaliseFinanceira,
  getContagensAgenda,
  getProximosAgendamentos,
} from "@/actions/dashboard";

export default async function DashboardPage() {
  const [proximos, contagens, financeiro, profissionais, salas, servicos] = await Promise.all([
    getProximosAgendamentos(),
    getContagensAgenda(),
    getAnaliseFinanceira(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listSalas(),
    listAllServicos(),
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
              <AnaliseFinanceira analise={analise} atrasadas={atrasadas} />
            ),
          },
        ]}
      />
    </div>
  );
}
