"use client";

import { useState } from "react";
import { ArrowLeftRight, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ImagemSerie } from "@/actions/exame-imagens";
import { formatarData } from "@/lib/format";

const TIPO_LABEL = { AVALIACAO: "Avaliação", RETORNO: "Retorno" } as const;

function legenda(imagem: ImagemSerie) {
  return `${TIPO_LABEL[imagem.tipo]} ${formatarData(imagem.data)} · ${imagem.rotulo}`;
}

/**
 * Grade padrão da avaliação postural: letras A–L e números 1–16. A primeira
 * linha e a primeira coluna são só de rótulo — o canto fica vazio, A começa na
 * 2ª coluna e 1 na 2ª linha. Total: 13 colunas × 17 linhas de quadrados iguais.
 */
const LETRAS = "ABCDEFGHIJKL".split("");
const NUMEROS = Array.from({ length: 16 }, (_, i) => i + 1);
const TOTAL_COLUNAS = LETRAS.length + 1;
const TOTAL_LINHAS = NUMEROS.length + 1;

/** Texto branco com contorno escuro: legível sobre foto clara ou escura. */
const CONTORNO_TEXTO = {
  textShadow:
    "0 0 2px #000, 0 0 2px #000, 1px 1px 2px #000, -1px -1px 2px #000",
} as const;

const RotuloGrade = ({
  esquerda,
  topo,
  children,
}: {
  esquerda: number;
  topo: number;
  children: React.ReactNode;
}) => (
  <span
    className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] leading-none font-bold text-white sm:text-xs"
    style={{ left: `${esquerda}%`, top: `${topo}%`, ...CONTORNO_TEXTO }}
  >
    {children}
  </span>
);

function GradeNumerada() {
  const larguraCelula = 100 / TOTAL_COLUNAS;
  const alturaCelula = 100 / TOTAL_LINHAS;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* faixas de rótulo (1ª linha e 1ª coluna) levemente escurecidas */}
        <rect x={0} y={0} width={100} height={alturaCelula} fill="rgba(0,0,0,.35)" />
        <rect x={0} y={0} width={larguraCelula} height={100} fill="rgba(0,0,0,.35)" />

        {/* contorno claro por baixo + linha escura por cima: aparece em qualquer fundo */}
        {[0, 1].map((camada) => (
          <g
            key={camada}
            stroke={camada === 0 ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.65)"}
            strokeWidth={camada === 0 ? 2.2 : 1}
          >
            {Array.from({ length: TOTAL_COLUNAS + 1 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={i * larguraCelula}
                x2={i * larguraCelula}
                y1={0}
                y2={100}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {Array.from({ length: TOTAL_LINHAS + 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                x2={100}
                y1={i * alturaCelula}
                y2={i * alturaCelula}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ))}
      </svg>

      {LETRAS.map((letra, i) => (
        <RotuloGrade
          key={letra}
          esquerda={(i + 1.5) * larguraCelula}
          topo={0.5 * alturaCelula}
        >
          {letra}
        </RotuloGrade>
      ))}
      {NUMEROS.map((numero, i) => (
        <RotuloGrade
          key={numero}
          esquerda={0.5 * larguraCelula}
          topo={(i + 1.5) * alturaCelula}
        >
          {numero}
        </RotuloGrade>
      ))}
    </div>
  );
}

/**
 * Compara duas imagens sobrepondo uma na outra. O slider único mistura A e B:
 * à esquerda aparece a primeira imagem, à direita a segunda. A grade numerada
 * (A–L × 1–16) ajuda a comparar proporções e deslocamentos.
 */
export function ComparacaoImagensDialog({
  base,
  sobreposta,
  open,
  onOpenChange,
}: {
  base: ImagemSerie;
  sobreposta: ImagemSerie;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [trocadas, setTrocadas] = useState(false);
  // 0 = só a primeira imagem (A), 100 = só a segunda (B).
  const [mistura, setMistura] = useState(50);
  const [grade, setGrade] = useState(true);

  const a = trocadas ? sobreposta : base;
  const b = trocadas ? base : sobreposta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Comparar imagens</DialogTitle>
          <DialogDescription>
            Deslize entre as duas imagens para compará-las.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          <p>
            <span className="font-semibold">A:</span> {legenda(a)}
          </p>
          <p>
            <span className="font-semibold">B:</span> {legenda(b)}
          </p>
        </div>

        <div className="flex justify-center rounded-lg bg-muted/50 p-2">
          <div className="relative inline-block overflow-hidden rounded-md select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={`A: ${legenda(a)}`}
              draggable={false}
              className="block max-h-[62vh] max-w-full"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.url}
              alt={`B: ${legenda(b)}`}
              draggable={false}
              className="absolute inset-0 size-full object-contain"
              style={{ opacity: mistura / 100 }}
            />
            {grade && <GradeNumerada />}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cmp-mistura">Mistura entre as imagens</Label>
          <input
            id="cmp-mistura"
            type="range"
            min={0}
            max={100}
            value={mistura}
            onChange={(e) => setMistura(Number(e.target.value))}
            className="accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>← Imagem A</span>
            <span>Imagem B →</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={grade ? "default" : "outline"}
            size="sm"
            aria-pressed={grade}
            onClick={() => setGrade((v) => !v)}
          >
            <Grid3x3 />
            Grade
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTrocadas((v) => !v)}
          >
            <ArrowLeftRight />
            Trocar A e B
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
