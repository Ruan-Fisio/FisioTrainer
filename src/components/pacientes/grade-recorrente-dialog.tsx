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
  verificarConflitosGrade,
  type PreviewGradeState,
  type ConflitosGradeState,
} from "@/actions/grade-recorrente";
import type { GradeRecorrenteLinha } from "@/lib/validations/grade-recorrente";
import { formatarYmd } from "@/lib/format";

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
      </div>
    </div>
  );
}

/**
 * Lista os conflitos de verdade (profissional ou sala ocupados) que a checagem prévia
 * ao clicar em "Salvar" encontrou — datas específicas que ficariam sem agendamento se a
 * grade for salva do jeito que está. Mostrada só quando há algo a decidir; o usuário
 * escolhe ajustar a grade ou salvar mesmo assim (essas datas ficam sem agendamento; as
 * demais são criadas normalmente).
 */
function ConflitosGrade({ conflitos }: { conflitos: ConflitosGradeState["conflitos"] }) {
  if (conflitos.length === 0) return null;
  const visiveis = conflitos.slice(0, 8);
  const restantes = conflitos.length - visiveis.length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="font-medium text-destructive">
        {conflitos.length} atendimento(s) dessa grade não vão ser criados por conflito de
        horário:
      </p>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {visiveis.map((c, i) => (
          <li key={i}>
            {formatarYmd(c.data)} — {c.motivo}
          </li>
        ))}
        {restantes > 0 && <li>e mais {restantes} data(s)...</li>}
      </ul>
      <p className="text-xs text-muted-foreground">
        Ajuste o dia, horário ou profissional pra evitar isso, ou salve mesmo assim — só
        essas datas ficam sem agendamento, as demais são criadas normalmente.
      </p>
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
  const [conflitos, setConflitos] = useState<ConflitosGradeState["conflitos"]>([]);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLinhas(linhasIniciais);
      setErro(undefined);
      setConflitos([]);
    }
  }

  function atualizarLinhas(novas: GradeRecorrenteLinha[]) {
    setLinhas(novas);
    // Qualquer mudança na grade invalida os conflitos já checados — evita o usuário
    // salvar "mesmo assim" com base numa checagem que não corresponde mais à grade atual.
    setConflitos([]);
  }

  async function salvarDeFato() {
    const res = await salvarGradeRecorrente(atribuicaoId, linhas);
    if (res.error) {
      setErro(res.error);
      setConflitos([]);
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
  }

  /** Clique em "Salvar grade": checa conflitos reais antes de gravar — só interrompe o
   * fluxo quando há algo pra decidir; sem conflito, salva direto (mínimo de cliques). */
  function salvar() {
    setErro(undefined);
    startTransition(async () => {
      const check = await verificarConflitosGrade(atribuicaoId, linhas);
      if (check.error) {
        setErro(check.error);
        return;
      }
      if (check.conflitos.length > 0) {
        setConflitos(check.conflitos);
        return;
      }
      await salvarDeFato();
    });
  }

  function salvarMesmoAssim() {
    startTransition(salvarDeFato);
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
          onChange={atualizarLinhas}
          modalidades={modalidades}
          atendimentos={atendimentos}
          opcoes={opcoes}
        />

        <PreviaGrade atribuicaoId={atribuicaoId} linhas={linhas} />

        <ConflitosGrade conflitos={conflitos} />

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          {conflitos.length > 0 ? (
            <>
              <Button variant="outline" onClick={() => setConflitos([])} disabled={pending}>
                Ajustar grade
              </Button>
              <Button variant="destructive" onClick={salvarMesmoAssim} disabled={pending}>
                {pending ? "Salvando…" : "Salvar mesmo assim"}
              </Button>
            </>
          ) : (
            <Button onClick={salvar} disabled={pending}>
              {pending ? "Verificando…" : "Salvar grade"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
