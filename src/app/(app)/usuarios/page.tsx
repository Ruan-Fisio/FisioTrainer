import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsuariosTable } from "@/components/usuarios/usuarios-table";
import { UsuariosTableSkeleton } from "@/components/skeletons/usuarios-table-skeleton";
import { SearchInput } from "@/components/usuarios/search-input";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function UsuariosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários com acesso à aplicação.
          </p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo">
            <Plus />
            Novo usuário
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} />

      <Suspense key={`${page}-${search}`} fallback={<UsuariosTableSkeleton />}>
        <UsuariosTable page={page} search={search} />
      </Suspense>
    </div>
  );
}
