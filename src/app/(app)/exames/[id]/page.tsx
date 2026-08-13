import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getExame } from "@/actions/exames";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exame = await getExame(id);

  if (!exame) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{exame.nome}</h1>
          {exame.descricao && (
            <p className="text-sm text-muted-foreground">
              {exame.descricao}
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/exames/${id}/editar`}>
            <Pencil />
            Editar
          </Link>
        </Button>
      </div>

      {exame.secoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma seção cadastrada para este exame.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {exame.secoes.map((secao) => (
            <Card key={secao.id}>
              <CardHeader>
                <CardTitle>{secao.nome}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {secao.campos.map((campo) => (
                  <div key={campo.id} className="flex flex-col gap-2">
                    {campo.nome && (
                      <p className="text-sm font-medium">{campo.nome}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {campo.colunas.map((coluna) => (
                        <Badge key={coluna.id} variant="secondary">
                          {coluna.titulo}
                          {coluna.formatacao ? ` (${coluna.formatacao})` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
