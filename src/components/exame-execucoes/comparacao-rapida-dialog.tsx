"use client";

import { useMemo, useState, useTransition } from "react";
import { Columns3, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getComparacaoRapida } from "@/actions/exame-execucoes";
import { ValorColuna } from "@/components/exame-execucoes/execucao-detalhe";
import { ComparacaoRapidaGrafico } from "@/components/exame-execucoes/comparacao-rapida-grafico";
import { montarSeriesNumericas } from "@/lib/comparacao-rapida";
import { formatarData } from "@/lib/format";

type Retorno = { id: string; data: Date };

type Resultado = NonNullable<Awaited<ReturnType<typeof getComparacaoRapida>>>;

export function ComparacaoRapidaDialog({
  avaliacaoId,
  avaliacaoData,
  retornos,
}: {
  avaliacaoId: string;
  avaliacaoData: Date;
  retornos: Retorno[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"selecao" | "resultado">("selecao");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pending, startTransition] = useTransition();

  const series = useMemo(
    () => (resultado ? montarSeriesNumericas(resultado.secoes, resultado.execucoes.map((e) => e.id)) : []),
    [resultado],
  );

  function toggleRetorno(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("selecao");
      setSelecionados(new Set());
      setResultado(null);
    }
  }

  function handleConfirmar() {
    startTransition(async () => {
      const dados = await getComparacaoRapida(avaliacaoId, Array.from(selecionados));
      if (!dados) {
        toast.error("Não foi possível montar a comparação.");
        return;
      }
      setResultado(dados);
      setStep("resultado");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 />
          Comparação rápida
        </Button>
      </DialogTrigger>
      <DialogContent className={step === "resultado" ? "sm:max-w-3xl" : undefined}>
        {step === "selecao" && (
          <>
            <DialogHeader>
              <DialogTitle>Comparação rápida</DialogTitle>
              <DialogDescription>
                Selecione os retornos que você quer comparar lado a lado com a
                avaliação.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Datas incluídas</Label>
                <div className="flex flex-col gap-1 rounded-md border p-2">
                  <div className="flex min-h-8 items-center gap-2 rounded px-2 text-sm text-muted-foreground">
                    <Checkbox checked disabled />
                    Avaliação — {formatarData(avaliacaoData)}
                  </div>
                  <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                    {retornos.map((retorno) => (
                      <label
                        key={retorno.id}
                        onClick={(event) => {
                          event.preventDefault();
                          toggleRetorno(retorno.id);
                        }}
                        className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 text-sm select-none hover:bg-muted"
                      >
                        <Checkbox
                          checked={selecionados.has(retorno.id)}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        Retorno — {formatarData(retorno.data)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={selecionados.size === 0 || pending}
                onClick={handleConfirmar}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "resultado" && resultado && (
          <>
            <DialogHeader>
              <DialogTitle>Comparação rápida — {resultado.exame.nome}</DialogTitle>
            </DialogHeader>

            <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto py-2">
              {resultado.secoes.map((secao) => (
                <div key={secao.id} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">{secao.nome}</h3>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left font-medium">Campo</th>
                          {resultado.execucoes.map((execucao) => (
                            <th
                              key={execucao.id}
                              className="p-2 text-left font-medium whitespace-nowrap"
                            >
                              {formatarData(execucao.data)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {secao.linhas.map((linha) => (
                          <tr
                            key={`${linha.coluna.id}::${linha.linha}`}
                            className="border-b last:border-0"
                          >
                            <td className="p-2 align-top">
                              <p className="font-medium">{linha.coluna.titulo}</p>
                              {(linha.campoNome || linha.repetivel) && (
                                <p className="text-xs text-muted-foreground">
                                  {linha.campoNome}
                                  {linha.repetivel
                                    ? ` — Entrada ${linha.linha + 1}`
                                    : ""}
                                </p>
                              )}
                            </td>
                            {resultado.execucoes.map((execucao) => (
                              <td key={execucao.id} className="p-2 align-top">
                                <ValorColuna
                                  tipo={linha.coluna.tipo}
                                  multiplaSelecao={linha.coluna.multiplaSelecao}
                                  valor={
                                    linha.valoresPorExecucaoId.get(execucao.id) ?? ""
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {series.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">
                    Evolução dos valores numéricos
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {series.map((serie) => (
                      <ComparacaoRapidaGrafico
                        key={serie.chave}
                        serie={serie}
                        execucoes={resultado.execucoes}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("selecao")}
              >
                Voltar
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`/api/execucoes/${avaliacaoId}/comparacao-rapida-pdf?execucoes=${resultado.execucoes.filter((e) => e.id !== avaliacaoId).map((e) => e.id).join(",")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download />
                  Baixar PDF
                </a>
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
