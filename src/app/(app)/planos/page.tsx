import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { PlanosTable } from "@/components/planos/planos-table";
import { PlanosTabs } from "@/components/planos/planos-tabs";
import { RenovacoesList } from "@/components/planos/renovacoes-list";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
};

export default async function PlanosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "renovacoes" ? "renovacoes" : "catalogo";
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os planos oferecidos, atribua a pacientes e renove os que já
            cumpriram todo o período.
          </p>
        </div>
        <Button asChild>
          <Link href="/planos/novo">
            <Plus />
            Novo plano
          </Link>
        </Button>
      </div>

      <PlanosTabs
        tab={tab}
        catalogo={
          <div className="flex flex-col gap-4">
            <SearchInput defaultValue={search} placeholder="Buscar por nome..." />
            <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
              <PlanosTable page={page} search={search} />
            </Suspense>
          </div>
        }
        renovacoes={
          <Suspense fallback={<TableSkeleton />}>
            <RenovacoesList />
          </Suspense>
        }
      />
    </div>
  );
}
