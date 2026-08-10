import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { CategoriasTable } from "@/components/categorias/categorias-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function CategoriasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as categorias usadas na biblioteca de exercícios.
          </p>
        </div>
        <Button asChild>
          <Link href="/biblioteca/categorias/novo">
            <Plus />
            Nova categoria
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <CategoriasTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
