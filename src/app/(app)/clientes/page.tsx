import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { SearchInput } from "@/components/filters/search-input";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os clientes e o histórico de exames de cada um.
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">
            <Plus />
            Novo cliente
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome ou CPF..." />

      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <ClientesTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
