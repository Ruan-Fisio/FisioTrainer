"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, File, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarUploadPreCadastro } from "@/actions/pre-cadastros";
import {
  MAX_ARQUIVOS_PRE_CADASTRO,
  mimeEfetivo,
  validarArquivo,
} from "@/lib/storage-keys";

type Item = {
  id: string;
  nome: string;
  status: "enviando" | "ok" | "erro";
  chave?: string;
  erro?: string;
};

/**
 * Anexos (fotos/exames) do formulário público. O envio ao R2 começa assim que
 * o arquivo é escolhido; o submit leva só as referências (hidden `arquivos`).
 */
export function ArquivosUpload({
  sessaoId,
  onEnviandoChange,
}: {
  sessaoId: string;
  onEnviandoChange: (enviando: boolean) => void;
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const ativos = itens.filter((i) => i.status !== "erro").length;

  useEffect(() => {
    onEnviandoChange(itens.some((i) => i.status === "enviando"));
  }, [itens, onEnviandoChange]);

  function atualizar(id: string, patch: Partial<Item>) {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function enviar(item: Item, file: File) {
    try {
      const ticket = await solicitarUploadPreCadastro({
        sessaoId,
        nome: file.name,
        mime: file.type,
        tamanho: file.size,
      });
      if ("error" in ticket) throw new Error(ticket.error);
      const put = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": mimeEfetivo(file.type) },
        body: file,
      });
      if (!put.ok) throw new Error("Falha no envio.");
      atualizar(item.id, { status: "ok", chave: ticket.chave });
    } catch (e) {
      atualizar(item.id, {
        status: "erro",
        erro: e instanceof Error ? e.message : "Falha no envio.",
      });
    }
  }

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
      if (ativos + aceitos.length >= MAX_ARQUIVOS_PRE_CADASTRO) {
        mensagem = `Limite de ${MAX_ARQUIVOS_PRE_CADASTRO} arquivos.`;
        break;
      }
      aceitos.push(file);
    }
    setErro(mensagem);
    setInputKey((k) => k + 1);
    if (aceitos.length === 0) return;

    const novos: Item[] = aceitos.map((file) => ({
      id: crypto.randomUUID(),
      nome: file.name,
      status: "enviando",
    }));
    setItens((prev) => [...prev, ...novos]);
    novos.forEach((item, idx) => void enviar(item, aceitos[idx]));
  }

  const referencias = itens
    .filter((i) => i.status === "ok" && i.chave)
    .map((i) => ({ chave: i.chave, nomeOriginal: i.nome }));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="anexos">Fotos e exames</Label>
      <input type="hidden" name="sessaoUpload" value={sessaoId} />
      <input type="hidden" name="arquivos" value={JSON.stringify(referencias)} />
      <Input
        key={inputKey}
        id="anexos"
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        disabled={ativos >= MAX_ARQUIVOS_PRE_CADASTRO}
      />
      <p className="text-xs text-muted-foreground">
        Até {MAX_ARQUIVOS_PRE_CADASTRO} arquivos de 15 MB (fotos, PDFs de
        exames...). Executáveis não são aceitos.
      </p>
      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {itens.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {itens.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
            >
              <File className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{item.nome}</span>
              {item.status === "enviando" && (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              )}
              {item.status === "ok" && (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              )}
              {item.status === "erro" && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3.5" />
                  {item.erro}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={item.status === "enviando"}
                onClick={() =>
                  setItens((prev) => prev.filter((i) => i.id !== item.id))
                }
              >
                <Trash2 className="text-destructive" />
                <span className="sr-only">Remover {item.nome}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
