import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
}

type Avaliacao = Awaited<ReturnType<typeof getAvaliacoesByPaciente>>[number];

function Lista({ avaliacoes }: { avaliacoes: Avaliacao[] }) {
  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma avaliação registrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {avaliacoes.map((avaliacao) => (
        <Card key={avaliacao.id}>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{avaliacao.exame.nome}</p>
              <p className="text-xs text-muted-foreground">
                {formatarData(avaliacao.data)}
              </p>
            </div>
            {avaliacao.retornos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {avaliacao.retornos.map((retorno) => (
                  <Badge key={retorno.id} variant="outline">
                    Retorno · {formatarData(retorno.data)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AvaliacoesPublicas({ avaliacoes }: { avaliacoes: Avaliacao[] }) {
  return (
    <Tabs defaultValue="FISIOTERAPIA">
      <TabsList className="w-full">
        <TabsTrigger className="flex-1" value="FISIOTERAPIA">
          Fisioterapia
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="EDUCACAO_FISICA">
          Educação Física
        </TabsTrigger>
      </TabsList>
      <TabsContent value="FISIOTERAPIA">
        <Lista
          avaliacoes={avaliacoes.filter((a) => a.exame.tipo === "FISIOTERAPIA")}
        />
      </TabsContent>
      <TabsContent value="EDUCACAO_FISICA">
        <Lista
          avaliacoes={avaliacoes.filter(
            (a) => a.exame.tipo === "EDUCACAO_FISICA",
          )}
        />
      </TabsContent>
    </Tabs>
  );
}
