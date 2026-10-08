"use client";

import { useState } from "react";
import { GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparacaoImagensDialog } from "@/components/pacientes/comparacao-imagens-dialog";
import type { SerieImagens } from "@/actions/exame-imagens";
import { formatarData } from "@/lib/format";

const TIPO_LABEL = { AVALIACAO: "Avaliação", RETORNO: "Retorno" } as const;

/** Imagens do paciente agrupadas por exame realizado, com comparação por sobreposição. */
export function PacienteImagensTab({ series }: { series: SerieImagens[] }) {
  // Até 2 imagens selecionadas por série (a mais antiga sai ao marcar a terceira).
  const [selecionadas, setSelecionadas] = useState<Record<string, string[]>>({});
  const [comparando, setComparando] = useState<string | null>(null);

  if (series.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma imagem anexada aos exames deste paciente. Use o ícone de
          anexos nas colunas do exame para adicionar fotos.
        </CardContent>
      </Card>
    );
  }

  function alternar(serieId: string, imagemId: string) {
    setSelecionadas((prev) => {
      const atual = prev[serieId] ?? [];
      const proximo = atual.includes(imagemId)
        ? atual.filter((id) => id !== imagemId)
        : [...atual, imagemId].slice(-2);
      return { ...prev, [serieId]: proximo };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {series.map((serie) => {
        const marcadas = selecionadas[serie.id] ?? [];
        const [idA, idB] = marcadas;
        const imgA = serie.imagens.find((i) => i.id === idA);
        const imgB = serie.imagens.find((i) => i.id === idB);
        return (
          <Card key={serie.id}>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{serie.exameNome}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Avaliação de {formatarData(serie.avaliacaoData)} ·{" "}
                  {serie.imagens.length} imagem
                  {serie.imagens.length !== 1 ? "ns" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {marcadas.length}/2 selecionadas
                </span>
                <Button
                  size="sm"
                  disabled={!imgA || !imgB}
                  onClick={() => setComparando(serie.id)}
                >
                  <GitCompare />
                  Comparar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {serie.imagens.map((imagem) => {
                  const posicao = marcadas.indexOf(imagem.id);
                  return (
                    <li key={imagem.id} className="flex flex-col gap-1">
                      <button
                        type="button"
                        aria-pressed={posicao >= 0}
                        onClick={() => alternar(serie.id, imagem.id)}
                        className={`relative aspect-[3/4] overflow-hidden rounded-lg ring-2 transition-all ${
                          posicao >= 0
                            ? "ring-primary"
                            : "ring-foreground/10 hover:ring-foreground/30"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagem.url}
                          alt={`${imagem.rotulo} — ${formatarData(imagem.data)}`}
                          className="size-full object-cover"
                        />
                        {posicao >= 0 && (
                          <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {posicao === 0 ? "A" : "B"}
                          </span>
                        )}
                      </button>
                      <p className="line-clamp-2 text-xs">{imagem.rotulo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {TIPO_LABEL[imagem.tipo]} · {formatarData(imagem.data)}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Toque em duas imagens para compará-las sobrepostas.
              </p>
            </CardContent>
            {imgA && imgB && comparando === serie.id && (
              <ComparacaoImagensDialog
                key={`${imgA.id}-${imgB.id}`}
                base={imgA}
                sobreposta={imgB}
                open
                onOpenChange={(aberto) => !aberto && setComparando(null)}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
