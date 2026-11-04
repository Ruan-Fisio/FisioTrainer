"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

type Ponto = { x: number; y: number };

/** Abaixo disso é um toque acidental, não uma assinatura. */
const MIN_PONTOS = 8;
const LARGURA_EXPORTADA = 900;
const ALTURA_EXPORTADA = 300;

function desenhar(ctx: CanvasRenderingContext2D, tracos: Ponto[][], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#111827";
  ctx.fillStyle = "#111827";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2.5, w / 200);
  for (const traco of tracos) {
    ctx.beginPath();
    traco.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x * w, p.y * h);
      else ctx.lineTo(p.x * w, p.y * h);
    });
    ctx.stroke();
  }
}

/**
 * Campo de assinatura com dedo, caneta ou mouse. Os pontos ficam em coordenadas relativas
 * (a proporção do campo é sempre 3:1), então girar o celular não apaga o que foi feito.
 */
export function AssinaturaPad({
  rotuloId,
  onChange,
}: {
  rotuloId: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracosRef = useRef<Ponto[][]>([]);
  const desenhandoRef = useRef(false);

  function redesenhar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) desenhar(ctx, tracosRef.current, canvas.width, canvas.height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) desenhar(ctx, tracosRef.current, canvas.width, canvas.height);
    };
    ajustar();
    const observer = new ResizeObserver(ajustar);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function pontoDoEvento(e: PointerEvent<HTMLCanvasElement>): Ponto {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  function iniciar(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    desenhandoRef.current = true;
    tracosRef.current.push([pontoDoEvento(e)]);
  }

  function mover(e: PointerEvent<HTMLCanvasElement>) {
    if (!desenhandoRef.current) return;
    tracosRef.current[tracosRef.current.length - 1].push(pontoDoEvento(e));
    redesenhar();
  }

  function terminar() {
    if (!desenhandoRef.current) return;
    desenhandoRef.current = false;
    const pontos = tracosRef.current.reduce((soma, t) => soma + t.length, 0);
    if (pontos < MIN_PONTOS) {
      onChange(null);
      return;
    }
    const saida = document.createElement("canvas");
    saida.width = LARGURA_EXPORTADA;
    saida.height = ALTURA_EXPORTADA;
    const ctx = saida.getContext("2d");
    if (!ctx) return;
    desenhar(ctx, tracosRef.current, saida.width, saida.height);
    onChange(saida.toDataURL("image/png"));
  }

  function limpar() {
    tracosRef.current = [];
    redesenhar();
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Fundo branco também no tema escuro: o traço é sempre escuro, como no PDF. */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-labelledby={rotuloId}
        data-testid="assinatura-pad"
        className="aspect-[3/1] w-full cursor-crosshair touch-none rounded-lg border border-input bg-white"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      />
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={limpar}>
          <Eraser />
          Limpar assinatura
        </Button>
      </div>
    </div>
  );
}
