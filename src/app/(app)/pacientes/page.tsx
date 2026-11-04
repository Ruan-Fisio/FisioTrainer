import { Suspense } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PacientesExcluidos } from "@/components/pacientes/pacientes-excluidos";
import { PacientesTable } from "@/components/pacientes/pacientes-table";
import { ToggleFilter } from "@/components/filters/toggle-filter";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { SearchInput } from "@/components/filters/search-input";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; excluidos?: string }>;
};

export default async function PacientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";
  const excluidos = params.excluidos === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os pacientes e o histórico de exames de cada um.
          </p>
        </div>
        <Button asChild>
          <Link href="/pacientes/novo">
            <Plus />
            Novo paciente
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput defaultValue={search} placeholder="Buscar por nome ou CPF..." />
        <ToggleFilter
          paramName="excluidos"
          label="Excluídos"
          icon={<Trash2 />}
          active={excluidos}
        />
      </div>

      <Suspense key={`${page}-${search}-${excluidos}`} fallback={<TableSkeleton />}>
        {excluidos ? (
          <PacientesExcluidos page={page} search={search} />
        ) : (
          <PacientesTable page={page} search={search} />
        )}
      </Suspense>
    </div>
  );
}
