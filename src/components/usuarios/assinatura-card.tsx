"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, PenLine, Signature, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AssinaturaPad } from "@/components/contratos/assinatura-pad";
import { removerMinhaAssinatura, salvarMinhaAssinatura } from "@/actions/assinatura-profissional";
import {
  processarDesenhoAssinatura,
  processarFotoAssinatura,
} from "@/components/usuarios/assinatura-processar";

type Modo = "desenhar" | "foto";

const MODOS: { valor: Modo; label: string; icon: React.ReactNode }[] = [
  { valor: "desenhar", label: "Desenhar", icon: <PenLine /> },
  { valor: "foto", label: "Enviar foto", icon: <Camera /> },
];

/** Prévia sempre em fundo branco: a tinta é escura também no tema escuro, como no PDF. */
function Previa({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex aspect-[3/1] w-full items-center justify-center rounded-lg border border-input bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL local */}
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" data-testid="assinatura-previa" />
    </div>
  );
}

/**
 * Assinatura do próprio usuário, usada nos documentos do paciente que ele emitir.
 * Só aparece na tela do usuário logado (a action também só age sobre ele). A página passa
 * `key` = id da versão atual, então salvar/remover remonta o card no estado de visualização.
 */
export function AssinaturaCard({ atual }: { atual: string | null }) {
  const router = useRouter();
  const rotuloDesenhoId = useId();
  const fotoId = useId();
  const [editando, setEditando] = useState(!atual);
  const [modo, setModo] = useState<Modo>("desenhar");
  const [nova, setNova] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [pendente, startTransition] = useTransition();

  function trocarModo(m: Modo) {
    setModo(m);
    setNova(null);
    setErro(null);
  }

  async function aoDesenhar(dataUrl: string | null) {
    setErro(null);
    if (!dataUrl) return setNova(null);
    const r = await processarDesenhoAssinatura(dataUrl);
    if (r.ok) setNova(r.dataUrl);
    else {
      setNova(null);
      setErro(r.erro);
    }
  }

  async function aoEscolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    setNova(null);
    setErro(null);
    if (!arquivo) return;
    setProcessando(true);
    try {
      const r = await processarFotoAssinatura(arquivo);
      if (r.ok) setNova(r.dataUrl);
      else setErro(r.erro);
    } finally {
      setProcessando(false);
    }
  }

  function salvar() {
    if (!nova) return;
    startTransition(async () => {
      const r = await salvarMinhaAssinatura(nova);
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      toast.success("Assinatura salva. Os próximos documentos já saem assinados.");
      router.refresh();
    });
  }

  function remover() {
    startTransition(async () => {
      await removerMinhaAssinatura();
      setConfirmarRemocao(false);
      toast.success("Assinatura removida. Documentos já emitidos continuam assinados.");
      router.refresh();
    });
  }

  function cancelar() {
    setNova(null);
    setErro(null);
    setEditando(false);
  }

  return (
    <Card data-testid="assinatura-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Signature className="size-5 text-primary" />
          Minha assinatura
        </CardTitle>
        <CardDescription>
          Entra nos documentos do paciente que você emitir. O encaminhamento multiprofissional e a
          solicitação de exames já trazem a assinatura no próprio modelo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {atual && !editando && (
          <>
            <Previa src={atual} alt="Sua assinatura atual" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setConfirmarRemocao(true)}>
                <Trash2 className="text-destructive" />
                Remover assinatura
              </Button>
              <Button type="button" onClick={() => setEditando(true)}>
                Trocar assinatura
              </Button>
            </div>
          </>
        )}

        {editando && (
          <>
            <div
              role="radiogroup"
              aria-label="Como enviar a assinatura"
              className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1.5"
            >
              {MODOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  role="radio"
                  aria-checked={modo === m.valor}
                  onClick={() => trocarModo(m.valor)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4",
                    modo === m.valor
                      ? "bg-background shadow-sm ring-1 ring-foreground/10 [&_svg]:text-sidebar-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {modo === "desenhar" ? (
              <div className="flex flex-col gap-2">
                <Label id={rotuloDesenhoId}>Desenhe sua assinatura</Label>
                <AssinaturaPad rotuloId={rotuloDesenhoId} onChange={aoDesenhar} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor={fotoId}>Foto da assinatura</Label>
                <Input
                  id={fotoId}
                  type="file"
                  accept="image/*"
                  onChange={aoEscolherFoto}
                  disabled={processando}
                />
                <p className="text-xs text-muted-foreground">
                  Assine em papel branco com caneta escura e fotografe de perto, com boa luz. O
                  fundo é removido automaticamente.
                </p>
                {processando && <p className="text-sm text-muted-foreground">Tratando a foto…</p>}
                {nova && <Previa src={nova} alt="Prévia da assinatura enviada" />}
              </div>
            )}

            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}

            <div className="flex justify-end gap-2">
              {atual && (
                <Button type="button" variant="outline" onClick={cancelar} disabled={pendente}>
                  Cancelar
                </Button>
              )}
              <Button type="button" onClick={salvar} disabled={!nova || !!erro || processando || pendente}>
                {pendente ? "Salvando..." : "Salvar assinatura"}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover assinatura</DialogTitle>
            <DialogDescription>
              Os próximos documentos sairão sem assinatura. Os já emitidos continuam com a
              assinatura da época.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarRemocao(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remover} disabled={pendente}>
              {pendente ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
