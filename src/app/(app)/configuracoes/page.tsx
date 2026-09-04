import { listHorariosAtendimentoAgrupados } from "@/actions/horarios-atendimento";
import { HorariosAtendimentoCard } from "@/components/configuracoes/horarios-atendimento-card";

export default async function ConfiguracoesPage() {
  const grupos = await listHorariosAtendimentoAgrupados();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Horários de atendimento disponíveis para agendamento, por modalidade.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {grupos.map((grupo) => (
          <HorariosAtendimentoCard
            key={grupo.modalidade}
            modalidade={grupo.modalidade}
            horarios={grupo.horarios}
          />
        ))}
      </div>
    </div>
  );
}
