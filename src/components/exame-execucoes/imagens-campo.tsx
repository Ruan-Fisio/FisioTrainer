"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  File as FileIcon,
  Loader2,
  Paperclip,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ImagemExame } from "@/actions/exame-imagens";
import {
  ehImagem,
  MAX_ARQUIVOS_POR_COLUNA,
  validarArquivo,
} from "@/lib/storage-keys";

/** Arquivo escolhido nesta tela: enviado ao R2 na hora, vinculado ao salvar. */
export type UploadItem = {
  id: string;
  nome: string;
  /** Miniatura local (só para imagens; vazio para outros arquivos). */
  previewUrl: string;
  status: "enviando" | "ok" | "erro";
  /** Chave na área temporária do R2 (só com status "ok"). */
  chave?: string;
  erro?: string;
};

/** Ícone + diálogo de imagens de uma coluna (exercício) do exame. */
export function ImagensCampo({
  titulo,
  existentes,
  enviados,
  removidas,
  onAdicionar,
  onRemoverEnviado,
  onAlternarRemocao,
}: {
  titulo: string;
  existentes: ImagemExame[];
  enviados: UploadItem[];
  removidas: Set<string>;
  onAdicionar: (files: File[]) => void;
  onRemoverEnviado: (itemId: string) => void;
  onAlternarRemocao: (imagemId: string) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const inputId = useId();
  const total =
    existentes.filter((i) => !removidas.has(i.id)).length +
    enviados.filter((i) => i.status !== "erro").length;
  const enviando = enviados.some((i) => i.status === "enviando");

  function handleFiles(lista: FileList | null) {
    if (!lista) return;
    const aceitos: File[] = [];
    let mensagem: string | null = null;
    for (const file of Array.from(lista)) {
      const problema = validarArquivo(file.name, file.size);
      if (problema) {
        mensagem = `${file.name}: ${problema}`;
        continue;
      }
      if (total + aceitos.length >= MAX_ARQUIVOS_POR_COLUNA) {
        mensagem = `Limite de ${MAX_ARQUIVOS_POR_COLUNA} arquivos por coluna.`;
        break;
      }
      aceitos.push(file);
    }
    setErro(mensagem);
    if (aceitos.length > 0) onAdicionar(aceitos);
    setInputKey((k) => k + 1);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={total > 0 ? "secondary" : "ghost"}
          size={total > 0 ? "sm" : "icon-sm"}
          className="shrink-0"
        >
          {enviando ? <Loader2 className="animate-spin" /> : <Paperclip />}
          {total > 0 && <span>{total}</span>}
          <span className="sr-only">Arquivos de {titulo || "coluna"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Arquivos — {titulo || "coluna"}</DialogTitle>
          <DialogDescription>
            O envio começa assim que você escolhe os arquivos. Qualquer tipo,
            até 15 MB cada — exceto executáveis e scripts (.exe, .sh, .bat...).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>Adicionar arquivos</Label>
          <input
            key={inputKey}
            id={inputId}
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </div>

        {existentes.length === 0 && enviados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum arquivo nesta coluna.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existentes.map((imagem) => {
              const removida = removidas.has(imagem.id);
              return (
                <li key={imagem.id} className="flex flex-col gap-1">
                  <div
                    className={`aspect-square overflow-hidden rounded-lg ring-1 ring-foreground/10 ${
                      removida ? "opacity-40" : ""
                    }`}
                  >
                    {ehImagem(imagem.mime) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagem.url}
                        alt={imagem.nomeOriginal}
                        className="size-full object-cover"
                      />
                    ) : (
                      <a
                        href={imagem.url}
                        className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs hover:bg-accent"
                      >
                        <FileIcon className="size-6" />
                        <span className="line-clamp-2 break-all">
                          {imagem.nomeOriginal}
                        </span>
                      </a>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onAlternarRemocao(imagem.id)}
                  >
                    {removida ? (
                      "Desfazer remoção"
                    ) : (
                      <>
                        <Trash2 className="text-destructive" />
                        Remover
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
            {enviados.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <div
                  className={`relative aspect-square overflow-hidden rounded-lg ring-1 ${
                    item.status === "erro"
                      ? "ring-destructive/60"
                      : "ring-foreground/10"
                  }`}
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.nome}
                      className={`size-full object-cover ${
                        item.status === "ok" ? "" : "opacity-50"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs ${
                        item.status === "ok" ? "" : "opacity-50"
                      }`}
                    >
                      <FileIcon className="size-6" />
                      <span className="line-clamp-2 break-all">{item.nome}</span>
                    </div>
                  )}
                  {item.status === "enviando" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="size-6 animate-spin" />
                      <span className="sr-only">Enviando</span>
                    </span>
                  )}
                  {item.status === "erro" && (
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-destructive/90 px-1.5 py-1 text-[11px] text-white">
                      <AlertCircle className="size-3 shrink-0" />
                      <span className="truncate">{item.erro ?? "Falha"}</span>
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={item.status === "enviando"}
                  onClick={() => onRemoverEnviado(item.id)}
                >
                  <Trash2 className="text-destructive" />
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
