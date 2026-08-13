import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvaliacoesList } from "@/components/exame-execucoes/avaliacoes-list";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

const HISTORICO_FIELDS: { key: keyof HistoricoCliente; label: string }[] = [
  { key: "historicoClinico", label: "Histórico Clínico" },
  { key: "objetivo", label: "Objetivo" },
  { key: "doencasPreexistentes", label: "Doenças Pré-existentes" },
  { key: "cirurgiasAnteriores", label: "Cirurgias Anteriores" },
  { key: "medicamentos", label: "Medicamentos" },
];

type HistoricoCliente = {
  historicoClinico: string | null;
  objetivo: string | null;
  doencasPreexistentes: string | null;
  cirurgiasAnteriores: string | null;
  medicamentos: string | null;
};

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {[
              cliente.idade != null ? `${cliente.idade} anos` : null,
              cliente.cpf,
              cliente.contato,
            ]
              .filter(Boolean)
              .join(" · ") || "Sem dados de contato cadastrados"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clientes/${id}/editar`}>
            <Pencil />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico clínico</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HISTORICO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-sm">{cliente[key] || "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Avaliações</h2>
          <Button asChild size="sm">
            <Link href={`/clientes/${id}/exames/novo`}>
              <Plus />
              Nova avaliação
            </Link>
          </Button>
        </div>

        <Suspense fallback={<TableSkeleton />}>
          <AvaliacoesList clienteId={id} />
        </Suspense>
      </div>
    </div>
  );
}
