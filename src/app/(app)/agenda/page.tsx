import { Suspense } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import {
  Briefcase,
  CalendarClock,
  DoorOpen,
  Layers,
  ListChecks,
  Stethoscope,
  User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AgendaTabs } from "@/components/agendamentos/agenda-tabs";
import { AgendamentosTable } from "@/components/agendamentos/agendamentos-table";
import { CalendarioNav } from "@/components/agendamentos/calendario/calendario-nav";
import { CalendarioMes } from "@/components/agendamentos/calendario/calendario-mes";
import { CalendarioSemana } from "@/components/agendamentos/calendario/calendario-semana";
import { CalendarioDia } from "@/components/agendamentos/calendario/calendario-dia";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { DateRangeFilter } from "@/components/filters/date-range-filter";
import { ToggleFilter } from "@/components/filters/toggle-filter";
import { parseListParam } from "@/lib/search-params";
import { listAgendamentosPorIntervalo } from "@/actions/agendamentos";
import { materializarTodasGrades } from "@/actions/grade-recorrente";
import { listSalas } from "@/actions/salas";
import { listAllServicos } from "@/actions/servicos";
import { getIntervaloVisivel, type VisaoCalendario } from "@/lib/calendario";
import { toDateInputValue, TIMEZONE } from "@/lib/format";
import { combinarDataHora } from "@/lib/validations/agendamento";
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
    salas?: string;
    servicos?: string;
    planoHibrido?: string;
    status?: string;
    de?: string;
    ate?: string;
  }>;
};

async function CalendarioView({
  visao,
  dataReferencia,
  profissionalIds,
  modalidades,
  salaIds,
  servicoIds,
  planoHibrido,
}: {
  visao: VisaoCalendario;
  dataReferencia: Date;
  profissionalIds: string[];
  modalidades: string[];
  salaIds: string[];
  servicoIds: string[];
  planoHibrido: boolean;
}) {
  const { inicio, fim } = getIntervaloVisivel(visao, dataReferencia);
  const eventos = await listAgendamentosPorIntervalo({
    inicio,
    fim,
    profissionalIds,
    modalidades,
    salaIds,
    servicoIds,
    planoHibrido,
  });

  const titulo =
    visao === "mes"
      ? formatInTimeZone(dataReferencia, TIMEZONE, "MMMM yyyy", { locale: ptBR })
      : visao === "semana"
        ? `${formatInTimeZone(inicio, TIMEZONE, "d MMM", { locale: ptBR })} – ${formatInTimeZone(fim, TIMEZONE, "d MMM", { locale: ptBR })}`
        : formatInTimeZone(dataReferencia, TIMEZONE, "d 'de' MMMM", { locale: ptBR });

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
  // Completa as grades recorrentes de plano para o horizonte rolante (idempotente).
  await materializarTodasGrades();
  const tab = params.tab === "lista" ? "lista" : "calendario";
  const visao: VisaoCalendario =
    params.view === "semana" || params.view === "dia" ? params.view : "mes";
  // Dia-calendário sempre resolvido em Brasília: `toDateInputValue` (nunca `new Date()`
  // cru) pro "hoje" default, e `combinarDataHora` (via `date-fns-tz`) pra interpretar o
  // "YYYY-MM-DD" da URL como horário de Brasília em vez do fuso do processo. Ver "Fuso
  // horário" no CLAUDE.md.
  const ymdReferencia = params.data ?? toDateInputValue(new Date());
  const dataReferencia = combinarDataHora(ymdReferencia, "12:00");

  const page = Number(params.page ?? "1") || 1;
  const pacienteIds = parseListParam(params.pacientes);
  const profissionalIds = parseListParam(params.profissionais);
  const modalidades = parseListParam(params.modalidades);
  const salaIds = parseListParam(params.salas);
  const servicoIds = parseListParam(params.servicos);
  const planoHibrido = params.planoHibrido === "1";
  const status = parseListParam(params.status);
  const de = params.de ?? "";
  const ate = params.ate ?? "";

  const [pacientes, profissionais, salas, servicos] = await Promise.all([
    prisma.paciente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listSalas(),
    listAllServicos(),
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
  const modalidadeFilter = (
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
  );
  const salaFilter = (
    <MultiSelectFilter
      paramName="salas"
      placeholder="Sala"
      icon={<DoorOpen className="size-4 text-muted-foreground" />}
      options={salas.map((s) => ({ id: s.id, label: s.nome }))}
      defaultValue={salaIds}
    />
  );
  const servicoFilter = (
    <MultiSelectFilter
      paramName="servicos"
      placeholder="Serviço"
      icon={<Briefcase className="size-4 text-muted-foreground" />}
      options={servicos.map((s) => ({ id: s.id, label: s.nome }))}
      defaultValue={servicoIds}
    />
  );
  const planoHibridoFilter = (
    <ToggleFilter
      paramName="planoHibrido"
      label="Só planos híbridos"
      icon={<Layers className="size-4" />}
      active={planoHibrido}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral dos atendimentos da clínica. Para agendar, remarcar ou
          marcar presença, use a aba <span className="font-medium">Agendamentos</span>{" "}
          do paciente ou o dashboard.
        </p>
      </div>

      <AgendaTabs
        tab={tab}
        calendario={
          <div className="flex flex-col gap-4">
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
              {profissionalFilter}
              {modalidadeFilter}
              {salaFilter}
              {servicoFilter}
              {planoHibridoFilter}
            </div>
            <CalendarioView
              visao={visao}
              dataReferencia={dataReferencia}
              profissionalIds={profissionalIds}
              modalidades={modalidades}
              salaIds={salaIds}
              servicoIds={servicoIds}
              planoHibrido={planoHibrido}
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
              {modalidadeFilter}
              {salaFilter}
              {servicoFilter}
              {planoHibridoFilter}
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
              key={`${page}-${pacienteIds.join(",")}-${profissionalIds.join(",")}-${modalidades.join(",")}-${salaIds.join(",")}-${servicoIds.join(",")}-${planoHibrido}-${status.join(",")}-${de}-${ate}`}
              fallback={<TableSkeleton />}
            >
              <AgendamentosTable
                page={page}
                pacienteIds={pacienteIds}
                profissionalIds={profissionalIds}
                modalidades={modalidades}
                salaIds={salaIds}
                servicoIds={servicoIds}
                planoHibrido={planoHibrido}
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
