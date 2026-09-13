"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  GradeSection,
  type GradeOpcoes,
  type ModalidadePlano,
} from "@/components/plano-atribuicoes/grade-section";
import {
  previewGradeRecorrente,
  salvarGradeRecorrente,
  type PreviewGradeState,
} from "@/actions/grade-recorrente";
import type { GradeRecorrenteLinha } from "@/lib/validations/grade-recorrente";

function formatarYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Prévia ao vivo de quanto a grade em edição preenche do total do plano — atualiza a cada
 * mudança nas linhas (debounced), pra responder "essa grade que eu montei fecha a conta do
 * plano, ou vou deixar atendimento sem preencher?" antes de salvar.
 */
function PreviaGrade({
  atribuicaoId,
  linhas,
}: {
  atribuicaoId: string;
  linhas: GradeRecorrenteLinha[];
}) {
  const [previa, setPrevia] = useState<PreviewGradeState | null>(null);
  const [carregando, startCarregando] = useTransition();

  const buscarPrevia = useDebouncedCallback((linhasAtuais: GradeRecorrenteLinha[]) => {
    startCarregando(async () => {
      setPrevia(await previewGradeRecorrente(atribuicaoId, linhasAtuais));
    });
  }, 400);

  useEffect(() => {
    if (linhas.length === 0) {
      setPrevia(null);
      return;
    }
    buscarPrevia(linhas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atribuicaoId, JSON.stringify(linhas)]);

  if (linhas.length === 0) return null;
  if (!previa || previa.error) return null;

  const { totalPlano, totalFinal, completo, ultimaData } = previa;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        completo
          ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
          : "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {carregando ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
      ) : (
        <CalendarCog className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="flex flex-col gap-0.5">
        {totalPlano == null ? (
          <p>
            Essa grade vai gerar <b>{totalFinal}</b> atendimento(s)
            {ultimaData ? ` até ${formatarYmd(ultimaData)}` : ""}.
          </p>
        ) : completo ? (
          <p>
            Essa grade preenche os <b>{totalPlano}</b> atendimentos do plano inteiro
            {ultimaData ? ` (o último cai em ${formatarYmd(ultimaData)})` : ""}.
          </p>
        ) : (
          <>
            <p>
              Essa grade só preenche <b>{totalFinal} de {totalPlano}</b> atendimentos do
              plano{ultimaData ? ` (até ${formatarYmd(ultimaData)})` : ""}.
            </p>
            <p>Adicione mais dias pra não deixar atendimento sem agendar.</p>
          </>
        )}
        <p className="text-xs opacity-80">
          Não conta conflito de sala/profissional — isso só é conferido ao salvar.
        </p>
      </div>
    </div>
  );
}

export function GradeRecorrenteDialog({
  atribuicaoId,
  planoNome,
  modalidades,
  atendimentos,
  linhasIniciais,
  opcoes,
}: {
  atribuicaoId: string;
  planoNome: string;
  modalidades: ModalidadePlano[];
  atendimentos: number | null;
  linhasIniciais: GradeRecorrenteLinha[];
  opcoes: GradeOpcoes;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [linhas, setLinhas] = useState<GradeRecorrenteLinha[]>(linhasIniciais);
  const [erro, setErro] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLinhas(linhasIniciais);
      setErro(undefined);
    }
  }

  function salvar() {
    setErro(undefined);
    startTransition(async () => {
      const res = await salvarGradeRecorrente(atribuicaoId, linhas);
      if (res.error) {
        setErro(res.error);
        return;
      }
      const r = res.resumo;
      const partes = [`${r?.criados ?? 0} agendamento(s) criado(s)`];
      if (r && r.pulados.length > 0) {
        partes.push(`${r.pulados.length} não coube(ram) no mês`);
      }
      toast.success(`Grade salva. ${partes.join(" · ")}.`);
      setOpen(false);
      router.refresh();
    });
  }

  if (modalidades.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Editar grade recorrente">
          <CalendarCog className="size-4" />
          <span className="sr-only">Editar grade recorrente</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade recorrente · {planoNome}</DialogTitle>
          <DialogDescription>
            Ajuste os dias fixos de atendimento. Ao salvar, todos os agendamentos
            futuros que ainda não aconteceram são refeitos conforme a nova grade,
            para todo o período do plano. Atendimentos já realizados, faltados ou
            cancelados não são afetados.
          </DialogDescription>
        </DialogHeader>

        <GradeSection
          bare
          linhas={linhas}
          onChange={setLinhas}
          modalidades={modalidades}
          atendimentos={atendimentos}
          opcoes={opcoes}
        />

        <PreviaGrade atribuicaoId={atribuicaoId} linhas={linhas} />

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={pending}>
            {pending ? "Salvando…" : "Salvar grade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
