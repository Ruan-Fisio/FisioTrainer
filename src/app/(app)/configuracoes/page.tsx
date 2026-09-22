import { CalendarRange, Clock, DollarSign, DoorOpen } from "lucide-react";
import { listHorariosAtendimentoAgrupados } from "@/actions/horarios-atendimento";
import { listSalas } from "@/actions/salas";
import { listDiasFuncionamento, listFeriados } from "@/actions/funcionamento";
import { listConfiguracoesTaxa } from "@/actions/configuracao-financeira";
import { getConfigSalas } from "@/lib/salas-config";
import { HorariosAtendimentoCard } from "@/components/configuracoes/horarios-atendimento-card";
import { SalasConfig } from "@/components/configuracoes/salas-config";
import { FuncionamentoConfig } from "@/components/configuracoes/funcionamento-config";
import { FinanceiroConfig } from "@/components/configuracoes/financeiro-config";
import { ConfiguracoesTabs } from "@/components/configuracoes/configuracoes-tabs";

export default async function ConfiguracoesPage() {
  const [grupos, salas, configSalas, diasFuncionamento, feriados, taxas] = await Promise.all([
    listHorariosAtendimentoAgrupados(),
    listSalas(),
    getConfigSalas(),
    listDiasFuncionamento(),
    listFeriados(),
    listConfiguracoesTaxa(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Horários, salas, funcionamento e taxas financeiras da clínica.
        </p>
      </div>

      <ConfiguracoesTabs
        defaultValue="horarios"
        tabs={[
          {
            value: "horarios",
            label: "Horários",
            icon: <Clock />,
            content: (
              <div className="flex flex-col gap-4">
                {grupos.map((grupo) => (
                  <HorariosAtendimentoCard
                    key={grupo.modalidade}
                    modalidade={grupo.modalidade}
                    horarios={grupo.horarios}
                    sala={configSalas[grupo.modalidade].sala}
                    capacidade={configSalas[grupo.modalidade].capacidade}
                  />
                ))}
              </div>
            ),
          },
          {
            value: "salas",
            label: "Salas",
            icon: <DoorOpen />,
            content: <SalasConfig salas={salas} />,
          },
          {
            value: "funcionamento",
            label: "Funcionamento",
            icon: <CalendarRange />,
            content: (
              <FuncionamentoConfig dias={diasFuncionamento} feriados={feriados} />
            ),
          },
          {
            value: "financeiro",
            label: "Financeiro",
            icon: <DollarSign />,
            content: <FinanceiroConfig taxas={taxas} />,
          },
        ]}
      />
    </div>
  );
}
