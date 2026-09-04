import { Suspense } from "react";
import { Layers, ListChecks } from "lucide-react";
import { SearchInput } from "@/components/filters/search-input";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { DateRangeFilter } from "@/components/filters/date-range-filter";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { LogsTable } from "@/components/logs/logs-table";
import { parseListParam } from "@/lib/search-params";
import { ACAO_LABEL, MODULO_LABEL } from "@/lib/audit";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    modulos?: string;
    acoes?: string;
    de?: string;
    ate?: string;
  }>;
};

const MODULO_OPTIONS = Object.entries(MODULO_LABEL).map(([id, label]) => ({ id, label }));
const ACAO_OPTIONS = Object.entries(ACAO_LABEL).map(([id, label]) => ({ id, label }));

export default async function LogsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = params.q ?? "";
  const page = Number(params.page ?? "1") || 1;
  const modulos = parseListParam(params.modulos);
  const acoes = parseListParam(params.acoes);
  const de = params.de ?? "";
  const ate = params.ate ?? "";

  const filters = {
    q: q || undefined,
    modulos,
    acoes,
    de: de || undefined,
    ate: ate || undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Trilha de auditoria — toda operação de escrita feita no sistema.
        </p>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
        <SearchInput placeholder="Buscar por resumo, usuário ou ID" defaultValue={q} />
        <MultiSelectFilter
          paramName="modulos"
          placeholder="Módulo"
          icon={<Layers className="size-4 text-muted-foreground" />}
          options={MODULO_OPTIONS}
          defaultValue={modulos}
        />
        <MultiSelectFilter
          paramName="acoes"
          placeholder="Ação"
          icon={<ListChecks className="size-4 text-muted-foreground" />}
          options={ACAO_OPTIONS}
          defaultValue={acoes}
        />
        <DateRangeFilter defaultFrom={de} defaultTo={ate} />
      </div>

      <Suspense
        key={`${q}-${page}-${modulos.join(",")}-${acoes.join(",")}-${de}-${ate}`}
        fallback={<TableSkeleton />}
      >
        <LogsTable filters={filters} page={page} />
      </Suspense>
    </div>
  );
}
