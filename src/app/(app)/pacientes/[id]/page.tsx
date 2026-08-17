import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AvaliacoesList } from "@/components/exame-execucoes/avaliacoes-list";
import { EvolucoesList } from "@/components/evolucoes/evolucoes-list";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";
import { getEvolucoesByPaciente } from "@/actions/evolucoes";
import { getMensalidadesByPaciente } from "@/actions/mensalidades";
import { getAgendamentosByPaciente } from "@/actions/agendamentos";
import { MensalidadesList } from "@/components/mensalidades/mensalidades-list";
import { AgendamentosList } from "@/components/agendamentos/agendamentos-list";
import { formatarMoeda } from "@/lib/format";
import { HistoricoClinicoDialog } from "@/components/pacientes/historico-clinico-dialog";
import { CollapsibleSection } from "@/components/collapsible-section";

async function AvaliacoesListLoader({ pacienteId }: { pacienteId: string }) {
  const avaliacoes = await getAvaliacoesByPaciente(pacienteId);
  return <AvaliacoesList pacienteId={pacienteId} avaliacoes={avaliacoes} />;
}

async function EvolucoesListLoader({ pacienteId }: { pacienteId: string }) {
  const evolucoes = await getEvolucoesByPaciente(pacienteId);
  return <EvolucoesList pacienteId={pacienteId} evolucoes={evolucoes} />;
}

async function MensalidadesListLoader({ pacienteId }: { pacienteId: string }) {
  const mensalidades = await getMensalidadesByPaciente(pacienteId);
  return (
    <MensalidadesList pacienteId={pacienteId} mensalidades={mensalidades} />
  );
}

async function AgendamentosListLoader({ pacienteId }: { pacienteId: string }) {
  const agendamentos = await getAgendamentosByPaciente(pacienteId);
  return <AgendamentosList agendamentos={agendamentos} />;
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

      {(paciente.planoNome || paciente.planoValor != null) && (
        <p className="text-sm text-muted-foreground">
          Plano: <span className="font-medium text-foreground">
            {paciente.planoNome ?? "—"}
          </span>
          {paciente.planoValor != null
            ? ` · ${formatarMoeda(Number(paciente.planoValor))}`
            : ""}
        </p>
      )}

      <CollapsibleSection
        title="Retornos e reavaliações"
        action={
          <Button asChild size="sm">
            <Link href={`/agenda/novo?pacienteId=${id}`}>
              <Plus />
              Novo agendamento
            </Link>
          </Button>
        }
      >
        <Suspense fallback={<TableSkeleton />}>
          <AgendamentosListLoader pacienteId={id} />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection
        title="Mensalidades"
        action={
          <Button asChild size="sm">
            <Link href={`/pacientes/${id}/mensalidades/novo`}>
              <Plus />
              Nova mensalidade
            </Link>
          </Button>
        }
      >
        <Suspense fallback={<TableSkeleton />}>
          <MensalidadesListLoader pacienteId={id} />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection
        title="Evoluções"
        action={
          <Button asChild size="sm">
            <Link href={`/pacientes/${id}/evolucoes/novo`}>
              <Plus />
              Nova evolução
            </Link>
          </Button>
        }
      >
        <Suspense fallback={<TableSkeleton />}>
          <EvolucoesListLoader pacienteId={id} />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection
        title="Avaliações"
        action={
          <Button asChild size="sm">
            <Link href={`/pacientes/${id}/exames/novo`}>
              <Plus />
              Nova avaliação
            </Link>
          </Button>
        }
      >
        <Suspense fallback={<TableSkeleton />}>
          <AvaliacoesListLoader pacienteId={id} />
        </Suspense>
      </CollapsibleSection>
    </div>
  );
}
