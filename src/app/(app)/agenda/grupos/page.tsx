import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { GruposPacientesTable } from "@/components/grupos-pacientes/grupos-pacientes-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function GruposPacientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Grupos de pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Crie grupos pré-estabelecidos para agilizar a criação de eventos na agenda.
          </p>
        </div>
        <Button asChild>
          <Link href="/agenda/grupos/novo">
            <Plus />
            Novo grupo
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <GruposPacientesTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
