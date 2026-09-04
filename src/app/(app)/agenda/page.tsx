import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, ListChecks, Plus, Stethoscope, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AgendaTabs } from "@/components/agendamentos/agenda-tabs";
import { AgendamentosTable } from "@/components/agendamentos/agendamentos-table";
import { CalendarioNav } from "@/components/agendamentos/calendario/calendario-nav";
import { CalendarioMes } from "@/components/agendamentos/calendario/calendario-mes";
import { CalendarioSemana } from "@/components/agendamentos/calendario/calendario-semana";
import { CalendarioDia } from "@/components/agendamentos/calendario/calendario-dia";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { DateRangeFilter } from "@/components/filters/date-range-filter";
import { parseListParam } from "@/lib/search-params";
import { listAgendamentosPorIntervalo } from "@/actions/agendamentos";
import { getIntervaloVisivel, type VisaoCalendario } from "@/lib/calendario";
import {
  STATUS_AGENDAMENTO_LABEL,
  MODALIDADE_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    view?: string;
    data?: string;
    page?: string;
    pacientes?: string;
    profissionais?: string;
    modalidades?: string;
    status?: string;
    de?: string;
    ate?: string;
  }>;
};

async function CalendarioView({
  visao,
  dataReferencia,
  profissionalIds,
}: {
  visao: VisaoCalendario;
  dataReferencia: Date;
  profissionalIds: string[];
}) {
  const { inicio, fim } = getIntervaloVisivel(visao, dataReferencia);
  const eventos = await listAgendamentosPorIntervalo({ inicio, fim, profissionalIds });

  const titulo =
    visao === "mes"
      ? format(dataReferencia, "MMMM yyyy", { locale: ptBR })
      : visao === "semana"
        ? `${format(inicio, "d MMM", { locale: ptBR })} – ${format(fim, "d MMM", { locale: ptBR })}`
        : format(dataReferencia, "d 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-4">
      <CalendarioNav visao={visao} dataReferencia={dataReferencia} titulo={titulo} />
      {visao === "mes" && (
        <CalendarioMes inicio={inicio} fim={fim} dataReferencia={dataReferencia} eventos={eventos} />
      )}
      {visao === "semana" && <CalendarioSemana inicio={inicio} fim={fim} eventos={eventos} />}
      {visao === "dia" && <CalendarioDia dataReferencia={dataReferencia} eventos={eventos} />}
    </div>
  );
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "lista" ? "lista" : "calendario";
  const visao: VisaoCalendario =
    params.view === "semana" || params.view === "dia" ? params.view : "mes";
  const dataReferencia = params.data ? new Date(`${params.data}T00:00:00`) : new Date();

  const page = Number(params.page ?? "1") || 1;
  const pacienteIds = parseListParam(params.pacientes);
  const profissionalIds = parseListParam(params.profissionais);
  const modalidades = parseListParam(params.modalidades);
  const status = parseListParam(params.status);
  const de = params.de ?? "";
  const ate = params.ate ?? "";

  const [pacientes, profissionais] = await Promise.all([
    prisma.paciente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const profissionalFilter = (
    <MultiSelectFilter
      paramName="profissionais"
      placeholder="Profissional"
      icon={<Stethoscope className="size-4 text-muted-foreground" />}
      options={profissionais.map((p) => ({ id: p.id, label: p.name ?? "Sem nome" }))}
      defaultValue={profissionalIds}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Consultas, retornos e compromissos da clínica.
          </p>
        </div>
        <Button asChild>
          <Link href="/agenda/novo">
            <Plus />
            Novo evento
          </Link>
        </Button>
      </div>

      <AgendaTabs
        tab={tab}
        calendario={
          <div className="flex flex-col gap-4">
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              {profissionalFilter}
            </div>
            <CalendarioView
              visao={visao}
              dataReferencia={dataReferencia}
              profissionalIds={profissionalIds}
            />
          </div>
        }
        lista={
          <div className="flex flex-col gap-4">
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              <MultiSelectFilter
                paramName="pacientes"
                placeholder="Paciente"
                icon={<User className="size-4 text-muted-foreground" />}
                options={pacientes.map((p) => ({ id: p.id, label: p.nome }))}
                defaultValue={pacienteIds}
              />
              {profissionalFilter}
              <MultiSelectFilter
                paramName="modalidades"
                placeholder="Modalidade"
                icon={<CalendarClock className="size-4 text-muted-foreground" />}
                options={Object.entries(MODALIDADE_AGENDAMENTO_LABEL).map(([id, label]) => ({
                  id,
                  label,
                }))}
                defaultValue={modalidades}
              />
              <MultiSelectFilter
                paramName="status"
                placeholder="Status"
                icon={<ListChecks className="size-4 text-muted-foreground" />}
                options={Object.entries(STATUS_AGENDAMENTO_LABEL).map(([id, { label }]) => ({
                  id,
                  label,
                }))}
                defaultValue={status}
              />
              <DateRangeFilter defaultFrom={de} defaultTo={ate} />
            </div>

            <Suspense
              key={`${page}-${pacienteIds.join(",")}-${profissionalIds.join(",")}-${modalidades.join(",")}-${status.join(",")}-${de}-${ate}`}
              fallback={<TableSkeleton />}
            >
              <AgendamentosTable
                page={page}
                pacienteIds={pacienteIds}
                profissionalIds={profissionalIds}
                modalidades={modalidades}
                status={status}
                de={de || undefined}
                ate={ate || undefined}
              />
            </Suspense>
          </div>
        }
      />
    </div>
  );
}
