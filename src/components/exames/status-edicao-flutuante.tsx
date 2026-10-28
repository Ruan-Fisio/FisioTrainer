"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarHora } from "@/lib/format";
import { listarResumido } from "@/lib/exame-mudancas";
import type { EstadoEdicao } from "@/components/exames/use-edicao-tempo-real";

/** Destaque na pílula quando chega alteração de outra pessoa. */
const DESTAQUE_RECEBIDO_MS = 6000;

/** "há 5s" / "há 2 min" para um instante recente. */
function haQuantoTempo(data: Date, agora: number): string {
  const s = Math.max(0, Math.round((agora - data.getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  return `há ${Math.round(s / 60)} min`;
}

/**
 * Indicador flutuante da edição em tempo real (fixo na tela — quem edita lá
 * embaixo vê o feedback sem rolar). Recolhido por padrão para não poluir: uma
 * pílula com o estado (buscando / salvando / salvo / pendente / erro), a
 * contagem até a próxima sincronização e, com alteração pendente, "Salvar
 * agora". Quando chega alteração de outra pessoa, destaca por alguns segundos.
 * O expansor mostra o resto: o que chegou (quem, quando, o quê), horários,
 * quem mais está editando e "Sincronizar agora".
 * Mobile: canto inferior esquerdo (o botão de salvar flutua à direita);
 * desktop: acima da barra do rodapé.
 */
export function StatusEdicaoFlutuante({
  estado,
  onSincronizarAgora,
  onMostrarErro,
}: {
  estado: EstadoEdicao;
  onSincronizarAgora: () => void;
  onMostrarErro: (path?: (string | number)[]) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { fase, erro, pendente, recebido, editores } = estado;
  const ocupado = fase !== "ocioso";
  const segundos =
    estado.proximaSincronizacaoEm === null
      ? null
      : Math.max(0, Math.ceil((estado.proximaSincronizacaoEm - agora) / 1000));
  // Destaque conta de quando a alteração chegou nesta tela, não de quando foi gravada.
  const recebidoRecente =
    recebido !== null &&
    estado.ultimaVerificacaoEm !== null &&
    agora - recebido.chegouEm.getTime() < DESTAQUE_RECEBIDO_MS;

  const icone =
    fase === "buscando" ? (
      <CloudDownload className="size-4 shrink-0 animate-pulse text-primary" />
    ) : fase === "salvando" ? (
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
    ) : erro ? (
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
    ) : pendente ? (
      <Pencil className="size-4 shrink-0 text-amber-600" />
    ) : recebidoRecente ? (
      <CloudDownload className="size-4 shrink-0 text-primary" />
    ) : (
      <Check className="size-4 shrink-0 text-green-600" />
    );

  const titulo =
    fase === "buscando"
      ? "Buscando alterações..."
      : fase === "salvando"
        ? "Salvando..."
        : erro?.tipo === "falha"
          ? "Sem conexão"
          : erro?.tipo === "invalido"
            ? "Não salvo"
            : pendente
              ? "Não salvo ainda"
              : recebidoRecente
                ? `Recebido de ${recebido.por ?? "outra pessoa"}`
                : estado.ultimoSalvoEm
                  ? `Salvo às ${formatarHora(estado.ultimoSalvoEm)}`
                  : "Tudo salvo";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 left-5 z-40 flex max-w-[calc(100vw-7rem)] flex-col rounded-2xl border bg-card/95 text-sm shadow-lg ring-1 ring-foreground/5 backdrop-blur transition-shadow md:right-8 md:bottom-24 md:left-auto",
        expandido && "w-[calc(100vw-7rem)] md:w-80",
        erro && "border-destructive/50",
        recebidoRecente && "ring-2 ring-primary/40",
      )}
    >
      {/* Pílula: sempre visível, compacta. */}
      <div className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
        {icone}
        <span className={cn("truncate font-medium", erro && "text-destructive")}>{titulo}</span>
        {!ocupado && segundos !== null && (
          <span
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            title="Próxima sincronização (a cada 10 segundos)"
          >
            · {segundos}s
          </span>
        )}
        {editores.length > 0 && (
          <span
            className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
            title={`${editores.join(", ")} também ${editores.length === 1 ? "está" : "estão"} editando`}
          >
            <Users className="size-3.5" />
            {editores.length}
          </span>
        )}
        {(pendente || erro?.tipo === "falha") && (
          <button
            type="button"
            onClick={onSincronizarAgora}
            disabled={ocupado}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/85 disabled:opacity-60"
          >
            <Save className="size-3" />
            Salvar agora
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label={expandido ? "Recolher detalhes do salvamento" : "Ver detalhes do salvamento"}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          {expandido ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {erro?.tipo === "invalido" && (
        <p className="px-3 pb-2 text-xs text-destructive">
          {erro.mensagem}{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => onMostrarErro(erro.path)}
          >
            Mostrar onde
          </button>
        </p>
      )}

      {expandido && (
        <div className="flex flex-col gap-2 border-t px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span className="tabular-nums">
              {ocupado
                ? "Sincronizando agora"
                : segundos !== null
                  ? `Próxima sincronização em ${segundos}s`
                  : "Sincronizando..."}
            </span>
            <button
              type="button"
              onClick={onSincronizarAgora}
              disabled={ocupado}
              className="flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3", ocupado && "animate-spin")} />
              Sincronizar agora
            </button>
          </div>

          <span className="text-muted-foreground">
            Salva sozinho a cada 10 segundos e traz o que os outros salvaram.
            {estado.ultimaVerificacaoEm &&
              ` Última verificação ${haQuantoTempo(estado.ultimaVerificacaoEm, agora)}.`}
            {estado.ultimoSalvoEm && ` Seu último salvamento às ${formatarHora(estado.ultimoSalvoEm)}.`}
          </span>

          {recebido && (
            <div
              className={cn(
                "rounded-lg px-2 py-1.5",
                recebidoRecente ? "bg-primary/10" : "bg-muted/60",
              )}
            >
              <span className="font-medium">
                {recebido.por ?? "Outra pessoa"} alterou às {formatarHora(recebido.em)}:
              </span>{" "}
              {listarResumido(recebido.itens, 5)}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            {editores.length > 0 ? (
              <span className="font-medium text-primary">
                {editores.join(", ")} {editores.length === 1 ? "também está" : "também estão"}{" "}
                editando
              </span>
            ) : (
              <span className="text-muted-foreground">Só você está editando agora</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
