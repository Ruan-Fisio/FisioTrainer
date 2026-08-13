import Link from "next/link";
import { listAvaliacoesByCliente } from "@/actions/exame-execucoes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExecucaoRowActions } from "@/components/exame-execucoes/execucao-row-actions";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export async function AvaliacoesList({ clienteId }: { clienteId: string }) {
  const avaliacoes = await listAvaliacoesByCliente(clienteId);

  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma avaliação cadastrada para este cliente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {avaliacoes.map((avaliacao) => (
        <Card key={avaliacao.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{avaliacao.exame.nome}</p>
                  <Badge variant="secondary">Avaliação</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatarData(avaliacao.data)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <Link
                    href={`/clientes/${clienteId}/exames/${avaliacao.id}/retorno`}
                  >
                    Novo retorno
                  </Link>
                </Button>
                <ExecucaoRowActions
                  id={avaliacao.id}
                  clienteId={clienteId}
                  tipo="AVALIACAO"
                />
              </div>
            </div>

            {avaliacao.retornos.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-3">
                {avaliacao.retornos.map((retorno) => (
                  <div
                    key={retorno.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Retorno</Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(retorno.data)}
                      </p>
                    </div>
                    <ExecucaoRowActions
                      id={retorno.id}
                      clienteId={clienteId}
                      tipo="RETORNO"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
