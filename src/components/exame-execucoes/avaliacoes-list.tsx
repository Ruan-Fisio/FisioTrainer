"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getAvaliacoesByPaciente } from "@/actions/exame-execucoes";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

type Avaliacao = Awaited<ReturnType<typeof getAvaliacoesByPaciente>>[number];

export function AvaliacoesList({
  pacienteId,
  avaliacoes,
}: {
  pacienteId: string;
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
        <AvaliacoesListContent
          pacienteId={pacienteId}
          avaliacoes={avaliacoes.filter((a) => a.exame.tipo === "FISIOTERAPIA")}
        />
      </TabsContent>
      <TabsContent value="EDUCACAO_FISICA">
        <AvaliacoesListContent
          pacienteId={pacienteId}
          avaliacoes={avaliacoes.filter((a) => a.exame.tipo === "EDUCACAO_FISICA")}
        />
      </TabsContent>
    </Tabs>
  );
}

function AvaliacoesListContent({
  pacienteId,
  avaliacoes,
}: {
  pacienteId: string;
  avaliacoes: Avaliacao[];
}) {
  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma avaliação cadastrada para este paciente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {avaliacoes.map((avaliacao) => (
        <Card key={avaliacao.id}>
          <CardContent className="flex flex-col gap-3">
            <Link
              href={`/pacientes/${pacienteId}/exames/${avaliacao.id}`}
              className="group -mx-4 -mt-4 flex items-center justify-between gap-2 rounded-t-xl px-4 pt-4 pb-2 transition-colors hover:bg-primary/5"
            >
              <div>
                <p className="font-medium">{avaliacao.exame.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarData(avaliacao.data)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <div className="flex justify-end">
              <Button size="sm" asChild>
                <Link
                  href={`/pacientes/${pacienteId}/exames/${avaliacao.id}/retorno`}
                >
                  Novo retorno
                </Link>
              </Button>
            </div>

            {avaliacao.retornos.length > 0 && (
              <div className="-mx-4 -mb-4 flex flex-col border-t">
                {avaliacao.retornos.map((retorno) => (
                  <Link
                    key={retorno.id}
                    href={`/pacientes/${pacienteId}/exames/${retorno.id}`}
                    className="group flex items-center justify-between gap-2 px-4 py-2.5 transition-colors last:rounded-b-xl hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Retorno</Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(retorno.data)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
