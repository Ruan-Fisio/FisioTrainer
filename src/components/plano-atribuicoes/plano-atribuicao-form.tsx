"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { FormActions } from "@/components/ui/form-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aplicarTaxaCartao, gerarValoresParcelas } from "@/lib/planos";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { PlanoAtribuicaoActionState } from "@/actions/plano-atribuicoes";

const initialState: PlanoAtribuicaoActionState = {};

type PlanoOpcao = { id: string; atendimentos: number; valor: number };
type PlanoAtivo = {
  id: string;
  nome: string;
  taxaCartao: number;
  opcoes: PlanoOpcao[];
};

export function PlanoAtribuicaoForm({
  action,
  planosAtivos,
  defaultValues,
  pacienteId,
  mode,
}: {
  action: (
    prevState: PlanoAtribuicaoActionState,
    formData: FormData,
  ) => Promise<PlanoAtribuicaoActionState>;
  planosAtivos: PlanoAtivo[];
  defaultValues?: {
    planoOpcaoId: string;
    cartao: boolean;
    vencimentos: string[];
  };
  pacienteId: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmadoRef = useRef(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [planoOpcaoId, setPlanoOpcaoId] = useState(
    defaultValues?.planoOpcaoId ?? planosAtivos[0]?.opcoes[0]?.id ?? "",
  );
  const [cartao, setCartao] = useState(defaultValues?.cartao ?? false);
  const [vencimentos, setVencimentos] = useState<string[]>(
    defaultValues?.vencimentos && defaultValues.vencimentos.length > 0
      ? defaultValues.vencimentos
      : [""],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(
        mode === "create"
          ? "Plano atribuído com sucesso."
          : "Atribuição atualizada com sucesso.",
      );
      router.push(`/pacientes/${pacienteId}`);
    }
  }, [state.success, mode, pacienteId, router]);

  const planoSelecionado = planosAtivos.find((p) =>
    p.opcoes.some((o) => o.id === planoOpcaoId),
  );
  const opcaoSelecionada = planoSelecionado?.opcoes.find(
    (o) => o.id === planoOpcaoId,
  );

  const valorFinal = useMemo(() => {
    if (!opcaoSelecionada || !planoSelecionado) return 0;
    return aplicarTaxaCartao(opcaoSelecionada.valor, planoSelecionado.taxaCartao, cartao);
  }, [opcaoSelecionada, planoSelecionado, cartao]);

  const preview = useMemo(() => {
    const datasValidas = vencimentos.filter(Boolean);
    if (datasValidas.length === 0 || !valorFinal) return [];
    const datasOrdenadas = [...datasValidas].sort();
    const valores = gerarValoresParcelas(valorFinal, datasOrdenadas.length);
    return datasOrdenadas.map((data, i) => ({
      data: new Date(`${data}T12:00:00`),
      valor: valores[i],
    }));
  }, [vencimentos, valorFinal]);

  if (planosAtivos.length === 0 && !defaultValues) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum plano com opções cadastradas. Cadastre um plano em{" "}
        <Link href="/planos/novo" className="underline">
          Planos
        </Link>{" "}
        antes de atribuir a um paciente.
      </p>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (mode === "edit" && !confirmadoRef.current) {
      e.preventDefault();
      setShowConfirm(true);
    }
  }

  function confirmarSalvar() {
    confirmadoRef.current = true;
    setShowConfirm(false);
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-4 pb-24"
    >
      <input type="hidden" name="cartao" value={String(cartao)} />
      {vencimentos.filter(Boolean).map((data, i) => (
        <input key={i} type="hidden" name="vencimentos" value={data} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="planoOpcaoId">Plano</Label>
        <NativeSelect
          id="planoOpcaoId"
          name="planoOpcaoId"
          value={planoOpcaoId}
          onChange={(e) => setPlanoOpcaoId(e.target.value)}
          required
        >
          {planosAtivos.map((p) => (
            <optgroup key={p.id} label={p.nome}>
              {p.opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.atendimentos}x atendimentos · {formatarMoeda(o.valor)}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </div>

      {planoSelecionado && planoSelecionado.taxaCartao > 0 && (
        <label
          onClick={(e) => {
            e.preventDefault();
            setCartao((v) => !v);
          }}
          className="flex min-h-8 cursor-pointer items-center gap-2 text-sm select-none"
        >
          <Checkbox checked={cartao} tabIndex={-1} className="pointer-events-none" />
          Pagamento no cartão (aplica taxa de {planoSelecionado.taxaCartao}%)
        </label>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Parcelas (data de vencimento de cada cobrança)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVencimentos((prev) => [...prev, ""])}
          >
            <Plus className="size-3.5" />
            Adicionar parcela
          </Button>
        </div>
        {vencimentos.map((data, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="date"
              value={data}
              onChange={(e) =>
                setVencimentos((prev) =>
                  prev.map((v, i) => (i === index ? e.target.value : v)),
                )
              }
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() =>
                setVencimentos((prev) => prev.filter((_, i) => i !== index))
              }
              disabled={vencimentos.length === 1}
            >
              <Trash2 className="size-4 text-destructive" />
              <span className="sr-only">Remover parcela</span>
            </Button>
          </div>
        ))}
      </div>

      {preview.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium">Cobranças que serão geradas</p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {preview.map((parcela, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>
                    Parcela {i + 1}/{preview.length}
                  </span>
                  <span>{formatarData(parcela.data)}</span>
                  <span className="font-medium text-foreground">
                    {formatarMoeda(parcela.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <FormActions
        submitLabel={mode === "create" ? "Atribuir plano" : "Salvar alterações"}
        onCancel={() => router.push(`/pacientes/${pacienteId}`)}
      />

      {mode === "edit" && (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Substituir cobranças pendentes?</DialogTitle>
              <DialogDescription>
                Salvar essa edição vai remover todas as cobranças pendentes
                desta atribuição e gerar novas cobranças automaticamente,
                com os dados atualizados. Cobranças já pagas não são
                afetadas. Deseja continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarSalvar}>Confirmar e salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}
