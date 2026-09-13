"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { renovarPlanoAtribuicao } from "@/actions/plano-atribuicoes";
import { inicioDoProximoMes } from "@/lib/datas-brasilia";
import { toDateInputValue } from "@/lib/format";

export function RenovarPlanoDialog({
  atribuicaoId,
  pacienteNome,
  planoNome,
  maxParcelas,
}: {
  atribuicaoId: string;
  pacienteNome: string;
  planoNome: string;
  maxParcelas: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [primeiraData, setPrimeiraData] = useState(() =>
    toDateInputValue(inicioDoProximoMes()),
  );
  const [numeroParcelas, setNumeroParcelas] = useState("1");
  const [erro, setErro] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPrimeiraData(toDateInputValue(inicioDoProximoMes()));
      setNumeroParcelas("1");
      setErro(undefined);
    }
  }

  const parcelasNum = Number(numeroParcelas);
  const parcelasValidas =
    Number.isInteger(parcelasNum) && parcelasNum >= 1 && parcelasNum <= maxParcelas;

  function renovar() {
    setErro(undefined);
    startTransition(async () => {
      const res = await renovarPlanoAtribuicao(
        atribuicaoId,
        primeiraData,
        parcelasNum,
      );
      if (res.error) {
        setErro(res.error);
        return;
      }
      toast.success("Plano renovado. A atribuição anterior foi concluída.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <RefreshCw className="size-4" />
          Renovar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renovar plano</DialogTitle>
          <DialogDescription>
            {planoNome} · {pacienteNome}. A atribuição atual vira <b>Concluída</b>{" "}
            (fica no histórico) e uma nova é criada com novas cobranças. A grade de
            atendimento não é copiada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`renov-data-${atribuicaoId}`}>
              Vencimento da 1ª parcela
            </Label>
            <Input
              id={`renov-data-${atribuicaoId}`}
              type="date"
              value={primeiraData}
              onChange={(e) => setPrimeiraData(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`renov-parcelas-${atribuicaoId}`}>
              Número de parcelas {maxParcelas === 1 ? "(parcela única)" : `(até ${maxParcelas})`}
            </Label>
            <Input
              id={`renov-parcelas-${atribuicaoId}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxParcelas}
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A 1ª parcela vence na data informada e as demais no mesmo dia dos
              meses seguintes.
            </p>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={renovar} disabled={pending || !parcelasValidas || !primeiraData}>
            {pending ? "Renovando…" : "Renovar plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
