"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Percent } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateConfiguracaoTaxa,
  type ConfiguracaoTaxaActionState,
} from "@/actions/configuracao-financeira";

type ConfiguracaoTaxa = {
  id: string;
  chave: string;
  nome: string;
  percentual: number;
};

const initial: ConfiguracaoTaxaActionState = {};

export function FinanceiroConfig({ taxas }: { taxas: ConfiguracaoTaxa[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Taxas aplicadas automaticamente pelo sistema. A taxa de parcelamento no cartão
        soma o percentual abaixo a cada parcela sobre o valor à vista de um Plano — 2x
        soma 2x o percentual, 3x soma 3x, e assim por diante.
      </p>

      <div className="flex flex-col gap-3">
        {taxas.map((taxa) => (
          <TaxaCard key={taxa.id} taxa={taxa} />
        ))}
      </div>
    </div>
  );
}

function TaxaCard({ taxa }: { taxa: ConfiguracaoTaxa }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="size-4 shrink-0 text-sidebar-primary" />
          {taxa.nome}
        </CardTitle>
        <CardAction>
          <TaxaFormDialog
            taxa={taxa}
            trigger={
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Pencil className="size-4" />
                <span className="sr-only">Editar {taxa.nome}</span>
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-semibold tabular-nums">
            {taxa.percentual.toFixed(2).replace(".", ",")}%
          </span>
          <span className="text-xs text-muted-foreground">por parcela</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxaFormDialog({ taxa, trigger }: { taxa: ConfiguracaoTaxa; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateConfiguracaoTaxa(taxa.id, initial, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Taxa atualizada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar taxa</DialogTitle>
          <DialogDescription>{taxa.nome}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxa-percentual">Percentual por parcela</Label>
            <InputGroup className="max-w-[10rem]">
              <InputGroupInput
                id="taxa-percentual"
                name="percentual"
                inputMode="decimal"
                defaultValue={taxa.percentual.toFixed(2).replace(".", ",")}
                placeholder="2,30"
                required
                autoFocus
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>%</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
