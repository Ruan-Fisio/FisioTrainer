import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExameFilters } from "@/components/exames/exame-filters";
import { ExamesTable } from "@/components/exames/exames-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ExamesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Exames</h1>
          <p className="text-sm text-muted-foreground">
            Monte e gerencie os modelos de exames da clínica.
          </p>
        </div>
        <Button asChild>
          <Link href="/exames/novo">
            <Plus />
            Novo exame
          </Link>
        </Button>
      </div>

      <Suspense>
        <ExameFilters search={search} />
      </Suspense>

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <ExamesTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
