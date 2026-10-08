"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  File as FileIcon,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatarDataHora } from "@/lib/format";
import { tipoPreview } from "@/lib/storage-keys";
import { mascararCelular } from "@/lib/telefone";

export type AnexoPreCadastro = {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
  url: string;
};

function formatarTamanho(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Visualizador({ anexo }: { anexo: AnexoPreCadastro }) {
  const tipo = tipoPreview(anexo.mime);

  if (!anexo.url) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Arquivo indisponível no momento.
      </p>
    );
  }
  if (tipo === "imagem") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={anexo.url}
        alt={anexo.nomeOriginal}
        className="mx-auto max-h-[58vh] max-w-full object-contain"
      />
    );
  }
  if (tipo === "pdf") {
    return (
      <iframe
        src={anexo.url}
        title={anexo.nomeOriginal}
        className="h-[58vh] w-full rounded-md bg-background"
      />
    );
  }
  if (tipo === "video") {
    return (
      <video
        src={anexo.url}
        controls
        className="mx-auto max-h-[58vh] max-w-full"
      />
    );
  }
  if (tipo === "audio") {
    return <audio src={anexo.url} controls className="mx-auto my-8 w-full max-w-md" />;
  }
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <FileIcon className="size-12 text-muted-foreground" />
      <p className="text-sm font-medium break-all">{anexo.nomeOriginal}</p>
      <p className="text-xs text-muted-foreground">
        Este tipo de arquivo não tem pré-visualização. Baixe para abrir.
      </p>
      <Button asChild>
        <a href={anexo.url}>
          <Download />
          Baixar
        </a>
      </Button>
    </div>
  );
}

/** Visualização completa de uma entrada da Fila de Curadoria, com os anexos. */
export function PreCadastroVisualizarDialog({
  nome,
  celular,
  createdAt,
  queixaPrincipal,
  anexos,
}: {
  nome: string;
  celular: string;
  createdAt: Date;
  queixaPrincipal: string;
  anexos: AnexoPreCadastro[];
}) {
  const [indice, setIndice] = useState(0);
  const atual = anexos[Math.min(indice, anexos.length - 1)];
  const abreInline = atual ? tipoPreview(atual.mime) !== null : false;

  return (
    <Dialog onOpenChange={(aberto) => aberto && setIndice(0)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye />
          Visualizar
          {anexos.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Paperclip className="size-3" />
              {anexos.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{nome}</DialogTitle>
          <DialogDescription>
            {mascararCelular(celular)} · enviado em {formatarDataHora(createdAt)}
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase text-muted-foreground">
            Queixa principal
          </h3>
          <p className="max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">
            {queixaPrincipal}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase text-muted-foreground">
            Fotos e exames ({anexos.length})
          </h3>

          {anexos.length === 0 || !atual ? (
            <p className="text-sm text-muted-foreground">
              Nenhum arquivo anexado neste pré-cadastro.
            </p>
          ) : (
            <>
              <div className="rounded-lg bg-muted/50 p-2">
                <Visualizador key={atual.id} anexo={atual} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={indice === 0}
                    onClick={() => setIndice((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft />
                    <span className="sr-only">Anterior</span>
                  </Button>
                  <span className="px-1 text-xs text-muted-foreground">
                    {indice + 1} de {anexos.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={indice >= anexos.length - 1}
                    onClick={() =>
                      setIndice((i) => Math.min(anexos.length - 1, i + 1))
                    }
                  >
                    <ChevronRight />
                    <span className="sr-only">Próximo</span>
                  </Button>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm">
                  {atual.nomeOriginal}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({formatarTamanho(atual.tamanho)})
                  </span>
                </p>
                {atual.url && (
                  <div className="flex gap-2">
                    {abreInline && (
                      <Button asChild variant="outline" size="sm">
                        <a href={atual.url} target="_blank" rel="noreferrer">
                          <ExternalLink />
                          Abrir
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {anexos.length > 1 && (
                <ul className="flex flex-wrap gap-2">
                  {anexos.map((anexo, i) => (
                    <li key={anexo.id}>
                      <button
                        type="button"
                        aria-pressed={i === indice}
                        onClick={() => setIndice(i)}
                        className={`flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg ring-2 ${
                          i === indice
                            ? "ring-primary"
                            : "ring-foreground/10 hover:ring-foreground/30"
                        }`}
                      >
                        {tipoPreview(anexo.mime) === "imagem" && anexo.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={anexo.url}
                            alt={anexo.nomeOriginal}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex flex-col items-center gap-0.5 px-1 text-[10px]">
                            <FileIcon className="size-4" />
                            <span className="w-full truncate">
                              {anexo.nomeOriginal}
                            </span>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
