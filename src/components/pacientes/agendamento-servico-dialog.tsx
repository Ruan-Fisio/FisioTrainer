"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { criarAgendamentoServico } from "@/actions/agendamentos";
import { getProfissionaisServico } from "@/actions/servicos";
import type { listAllServicos } from "@/actions/servicos";

type Servico = Awaited<ReturnType<typeof listAllServicos>>[number];
type Profissional = { id: string; name: string | null };

export function AgendamentoServicoDialog({
  pacienteId,
  servicos,
}: {
  pacienteId: string;
  servicos: Servico[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [carregandoProfissionais, startProfissionais] = useTransition();

  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  const [erro, setErro] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function resetar() {
    setServicoId("");
    setProfissionalId("");
    setProfissionais([]);
    setData("");
    setHoraInicio("");
    setHoraFim("");
    setErro(undefined);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetar();
  }

  useEffect(() => {
    if (!servicoId) {
      setProfissionais([]);
      setProfissionalId("");
      return;
    }
    startProfissionais(async () => {
      const res = await getProfissionaisServico(servicoId);
      setProfissionais(res);
      setProfissionalId("");
    });
  }, [servicoId]);

  function confirmar() {
    setErro(undefined);
    startTransition(async () => {
      const res = await criarAgendamentoServico({
        pacienteId,
        servicoId,
        profissionalId,
        data,
        horaInicio,
        horaFim,
      });
      if (res.error) {
        setErro(res.error);
        return;
      }
      toast.success("Agendamento criado com sucesso.");
      onOpenChange(false);
      router.refresh();
    });
  }

  const podeConfirmar =
    servicoId && profissionalId && data && horaInicio && horaFim && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus />
          Novo agendamento de serviço
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar serviço</DialogTitle>
          <DialogDescription>
            Agendamento avulso de um serviço fora do plano (Psicologia, Nutrição etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="servico-servico">Serviço</Label>
            <NativeSelect
              id="servico-servico"
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </NativeSelect>
            {servicos.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum serviço cadastrado ainda. Cadastre em Serviços.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="servico-profissional">Profissional</Label>
            <NativeSelect
              id="servico-profissional"
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              disabled={!servicoId || carregandoProfissionais}
            >
              <option value="">
                {!servicoId
                  ? "Escolha o serviço primeiro"
                  : carregandoProfissionais
                    ? "Carregando…"
                    : "Selecione…"}
              </option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? "Sem nome"}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="servico-data">Data</Label>
            <Input
              id="servico-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-hora-inicio">Horário de início</Label>
              <Input
                id="servico-hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-hora-fim">Horário de término</Label>
              <Input
                id="servico-hora-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!podeConfirmar}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Agendando…
              </>
            ) : (
              "Confirmar agendamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
