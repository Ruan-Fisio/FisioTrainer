import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExercicioFilters } from "@/components/exercicios/exercicio-filters";
import { ExerciciosTable } from "@/components/exercicios/exercicios-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { parseListParam } from "@/lib/search-params";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; categorias?: string }>;
};

export default async function ExerciciosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";
  const categoriaIds = parseListParam(params.categorias);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Exercícios</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a biblioteca de exercícios.
          </p>
        </div>
        <Button asChild>
          <Link href="/biblioteca/exercicios/novo">
            <Plus />
            Novo exercício
          </Link>
        </Button>
      </div>

      <Suspense>
        <ExercicioFilters search={search} categoriaIds={categoriaIds} />
      </Suspense>

      <Suspense
        key={`${page}-${search}-${categoriaIds.join(",")}`}
        fallback={<TableSkeleton />}
      >
        <ExerciciosTable
          page={page}
          search={search}
          categoriaIds={categoriaIds}
        />
      </Suspense>
    </div>
  );
}
