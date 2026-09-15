import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/filters/search-input";
import { ServicosTable } from "@/components/servicos/servicos-table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function ServicosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre serviços além de Fisioterapia e Educação Física (Psicologia,
            Nutrição etc.) para agendamento manual avulso na tela do paciente.
          </p>
        </div>
        <Button asChild>
          <Link href="/servicos/novo">
            <Plus />
            Novo serviço
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} placeholder="Buscar por nome..." />
      <Suspense key={`${page}-${search}`} fallback={<TableSkeleton />}>
        <ServicosTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
