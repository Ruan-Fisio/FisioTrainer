import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";
import { formatarData } from "@/lib/format";

type Avaliacao = Awaited<ReturnType<typeof getAvaliacoesByPaciente>>[number];

function Lista({
  token,
  avaliacoes,
}: {
  token: string;
  avaliacoes: Avaliacao[];
}) {
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
        <Card key={avaliacao.id} className="p-0">
          <Link
            href={`/compartilhado/paciente/${token}/exames/${avaliacao.id}`}
            className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
          >
            <div>
              <p className="font-medium">{avaliacao.exame.nome}</p>
              <p className="text-xs text-muted-foreground">
                {formatarData(avaliacao.data)}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          {avaliacao.retornos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t px-4 py-3">
              {avaliacao.retornos.map((retorno) => (
                <Link
                  key={retorno.id}
                  href={`/compartilhado/paciente/${token}/exames/${retorno.id}`}
                >
                  <Badge variant="outline">
                    Retorno · {formatarData(retorno.data)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function AvaliacoesPublicas({
  token,
  avaliacoes,
}: {
  token: string;
  avaliacoes: Avaliacao[];
}) {
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
          token={token}
          avaliacoes={avaliacoes.filter((a) => a.exame.tipo === "FISIOTERAPIA")}
        />
      </TabsContent>
      <TabsContent value="EDUCACAO_FISICA">
        <Lista
          token={token}
          avaliacoes={avaliacoes.filter(
            (a) => a.exame.tipo === "EDUCACAO_FISICA",
          )}
        />
      </TabsContent>
    </Tabs>
  );
}
