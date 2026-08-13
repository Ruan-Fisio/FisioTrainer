import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { MovimentosTable } from "@/components/movimentos/movimentos-table";
import { MovimentoCsvImport } from "@/components/movimentos/movimento-csv-import";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function GoniometriaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recovery Em Goniometria</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os movimentos e seus graus ideais.
          </p>
        </div>
        <div className="flex gap-2">
          <MovimentoCsvImport />
          <Button asChild>
            <Link href="/biblioteca-movimento/goniometria/novo">
              <Plus />
              Novo movimento
            </Link>
          </Button>
        </div>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <MovimentosTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
