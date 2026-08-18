import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { PlanosTable } from "@/components/planos/planos-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function PlanosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os planos oferecidos e atribua a pacientes para gerar as
            cobranças automaticamente.
          </p>
        </div>
        <Button asChild>
          <Link href="/planos/novo">
            <Plus />
            Novo plano
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <PlanosTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
