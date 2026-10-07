import { Suspense } from "react";
import Link from "next/link";
import { contarPreCadastrosPorStatus } from "@/actions/pre-cadastros";
import { PreCadastrosList } from "@/components/curadoria/pre-cadastros-list";
import { CopiarLinkButton } from "@/components/curadoria/copiar-link-button";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { SearchInput } from "@/components/filters/search-input";
import { cn } from "@/lib/utils";
import type { StatusPreCadastro } from "@/generated/prisma/client";

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
};

const ABAS: { status: StatusPreCadastro; param: string; label: string }[] = [
  { status: "PENDENTE", param: "pendentes", label: "Pendentes" },
  { status: "REJEITADO", param: "rejeitados", label: "Rejeitados" },
  { status: "APROVADO", param: "aprovados", label: "Aprovados" },
];

export default async function CuradoriaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";
  const aba = ABAS.find((a) => a.param === params.status) ?? ABAS[0];
  const contagem = await contarPreCadastrosPorStatus();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fila de Curadoria</h1>
          <p className="text-sm text-muted-foreground">
            Analise os pré-cadastros em ordem de chegada e efetive ou rejeite
            cada um.
          </p>
        </div>
        <CopiarLinkButton />
      </div>

      <nav
        aria-label="Status do pré-cadastro"
        className="grid grid-cols-3 gap-2 sm:flex"
      >
        {ABAS.map((a) => (
          <Link
            key={a.param}
            href={`/curadoria?status=${a.param}`}
            aria-current={a.status === aba.status ? "page" : undefined}
            className={cn(
              "rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
              a.status === aba.status
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {a.label} ({contagem[a.status]})
          </Link>
        ))}
      </nav>

      <SearchInput defaultValue={search} placeholder="Buscar por nome ou celular..." />

      <Suspense
        key={`${aba.param}-${page}-${search}`}
        fallback={<TableSkeleton />}
      >
        <PreCadastrosList status={aba.status} page={page} search={search} />
      </Suspense>
    </div>
  );
}
