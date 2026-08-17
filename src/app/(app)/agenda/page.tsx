import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, ListChecks, Plus, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { AgendamentosTable } from "@/components/agendamentos/agendamentos-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { DateRangeFilter } from "@/components/filters/date-range-filter";
import { parseListParam } from "@/lib/search-params";
import {
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
} from "@/components/agendamentos/agendamento-labels";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    pacientes?: string;
    tipos?: string;
    status?: string;
    de?: string;
    ate?: string;
  }>;
};

export default async function AgendaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const pacienteIds = parseListParam(params.pacientes);
  const tipos = parseListParam(params.tipos);
  const status = parseListParam(params.status);
  const de = params.de ?? "";
  const ate = params.ate ?? "";

  const pacientes = await prisma.paciente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Retornos, reavaliações e sessões agendadas dos pacientes.
          </p>
        </div>
        <Button asChild>
          <Link href="/agenda/novo">
            <Plus />
            Novo agendamento
          </Link>
        </Button>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
        <MultiSelectFilter
          paramName="pacientes"
          placeholder="Paciente"
          icon={<User className="size-4 text-muted-foreground" />}
          options={pacientes.map((p) => ({ id: p.id, label: p.nome }))}
          defaultValue={pacienteIds}
        />
        <MultiSelectFilter
          paramName="tipos"
          placeholder="Tipo"
          icon={<CalendarClock className="size-4 text-muted-foreground" />}
          options={Object.entries(TIPO_AGENDAMENTO_LABEL).map(
            ([id, label]) => ({ id, label }),
          )}
          defaultValue={tipos}
        />
        <MultiSelectFilter
          paramName="status"
          placeholder="Status"
          icon={<ListChecks className="size-4 text-muted-foreground" />}
          options={Object.entries(STATUS_AGENDAMENTO_LABEL).map(
            ([id, { label }]) => ({ id, label }),
          )}
          defaultValue={status}
        />
        <DateRangeFilter defaultFrom={de} defaultTo={ate} />
      </div>

      <Suspense
        key={`${page}-${pacienteIds.join(",")}-${tipos.join(",")}-${status.join(",")}-${de}-${ate}`}
        fallback={<TableSkeleton />}
      >
        <AgendamentosTable
          page={page}
          pacienteIds={pacienteIds}
          tipos={tipos}
          status={status}
          de={de || undefined}
          ate={ate || undefined}
        />
      </Suspense>
    </div>
  );
}
