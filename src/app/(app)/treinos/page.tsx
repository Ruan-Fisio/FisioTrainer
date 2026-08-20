import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TreinoFilters } from "@/components/treinos/treino-filters";
import { TreinosTable } from "@/components/treinos/treinos-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function TreinosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a biblioteca de treinos modelo.
          </p>
        </div>
        <Button asChild>
          <Link href="/treinos/novo">
            <Plus />
            Novo treino
          </Link>
        </Button>
      </div>

      <Suspense>
        <TreinoFilters search={search} />
      </Suspense>

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <TreinosTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
