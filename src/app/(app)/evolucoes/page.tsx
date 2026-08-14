import { Suspense } from "react";
import { User, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EvolucoesTable } from "@/components/evolucoes/evolucoes-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { DateRangeFilter } from "@/components/filters/date-range-filter";
import { parseListParam } from "@/lib/search-params";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    pacientes?: string;
    profissionais?: string;
    de?: string;
    ate?: string;
  }>;
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function ultimos30DiasPadrao() {
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  return { de: toDateInputValue(trintaDiasAtras), ate: toDateInputValue(hoje) };
}

export default async function EvolucoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const pacienteIds = parseListParam(params.pacientes);
  const profissionalIds = parseListParam(params.profissionais);
  const padrao = ultimos30DiasPadrao();
  const de = params.de ?? padrao.de;
  const ate = params.ate ?? padrao.ate;

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Evoluções</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de evoluções de fisioterapia registradas para os
          pacientes.
        </p>
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
          paramName="profissionais"
          placeholder="Profissional"
          icon={<Stethoscope className="size-4 text-muted-foreground" />}
          options={profissionais.map((p) => ({ id: p.id, label: p.name }))}
          defaultValue={profissionalIds}
        />
        <DateRangeFilter defaultFrom={de} defaultTo={ate} />
      </div>

      <Suspense
        key={`${page}-${pacienteIds.join(",")}-${profissionalIds.join(",")}-${de}-${ate}`}
        fallback={<TableSkeleton />}
      >
        <EvolucoesTable
          page={page}
          pacienteIds={pacienteIds}
          profissionalIds={profissionalIds}
          de={de || undefined}
          ate={ate || undefined}
        />
      </Suspense>
    </div>
  );
}
