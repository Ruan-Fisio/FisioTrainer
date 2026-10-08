"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Download,
  ExternalLink,
  File as FileIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agruparPorDia } from "@/lib/agrupar-por-data";
import { formatarHora, formatarYmd } from "@/lib/format";
import {
  mimeEfetivo,
  TAMANHO_MAXIMO_ARQUIVO,
  tipoPreview,
  validarArquivo,
} from "@/lib/storage-keys";

export type AnexoItem = {
  id: string;
  nomeOriginal: string;
  mime: string;
  tamanho: number;
  createdAt: Date;
  origem: "CLINICA" | "PACIENTE";
  url: string;
};

type Resultado = { error: string } | { success: true };

type Envio = {
  id: string;
  nome: string;
  status: "enviando" | "erro";
  erro?: string;
};

function formatarTamanho(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Upload e lista de anexos de um paciente, agrupados por dia. Serve a clínica
 * (histórico clínico) e o portal do paciente: quem monta passa as actions já
 * vinculadas ao paciente/token (`.bind`), então este componente nunca decide
 * a quem o arquivo pertence.
 */
export function AnexosPaciente({
  anexos,
  solicitarUpload,
  confirmar,
  remover,
  permitirExcluir,
  mostrarOrigem = false,
  vazio = "Nenhum anexo.",
}: {
  anexos: AnexoItem[];
  solicitarUpload: (input: {
    nome: string;
    mime: string;
    tamanho: number;
  }) => Promise<{ error: string } | { chave: string; url: string }>;
  confirmar: (input: { chave: string; nomeOriginal: string }) => Promise<Resultado>;
  remover: (anexoId: string) => Promise<Resultado>;
  /** Mostra o botão de excluir. A lista recebida já deve conter só o que a pessoa pode excluir. */
  permitirExcluir: boolean;
  /** Mostra a marca "Enviado pelo paciente" (visão da clínica). */
  mostrarOrigem?: boolean;
  vazio?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const anexosPorDia = agruparPorDia(anexos, (a) => a.createdAt);

  async function enviar(envio: Envio, file: File) {
    try {
      const ticket = await solicitarUpload({
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
      const conf = await confirmar({ chave: ticket.chave, nomeOriginal: file.name });
      if ("error" in conf) throw new Error(conf.error);
      setEnvios((prev) => prev.filter((e) => e.id !== envio.id));
      router.refresh();
    } catch (e) {
      setEnvios((prev) =>
        prev.map((x) =>
          x.id === envio.id
            ? {
                ...x,
                status: "erro",
                erro: e instanceof Error ? e.message : "Falha no envio.",
              }
            : x,
        ),
      );
    }
  }

  function handleFiles(lista: FileList | null) {
    if (!lista) return;
    const aceitos: File[] = [];
    let mensagem: string | null = null;
    for (const file of Array.from(lista)) {
      const problema = validarArquivo(file.name, file.size);
      if (problema) mensagem = `${file.name}: ${problema}`;
      else aceitos.push(file);
    }
    setErro(mensagem);
    setInputKey((k) => k + 1);

    const novos: Envio[] = aceitos.map((file) => ({
      id: crypto.randomUUID(),
      nome: file.name,
      status: "enviando",
    }));
    setEnvios((prev) => [...prev, ...novos]);
    novos.forEach((envio, i) => void enviar(envio, aceitos[i]));
  }

  async function excluir(anexoId: string) {
    setRemovendoId(anexoId);
    const res = await remover(anexoId);
    setRemovendoId(null);
    setConfirmandoId(null);
    if ("error" in res) toast.error(res.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>Adicionar arquivos</Label>
        <Input
          key={inputKey}
          id={inputId}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-xs text-muted-foreground">
          Laudos, exames, fotos... Qualquer tipo até{" "}
          {TAMANHO_MAXIMO_ARQUIVO / (1024 * 1024)} MB, exceto executáveis e
          scripts. O envio começa assim que você escolhe os arquivos.
        </p>
        {erro && <p className="text-xs text-destructive">{erro}</p>}
      </div>

      {envios.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {envios.map((envio) => (
            <li
              key={envio.id}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{envio.nome}</span>
              {envio.status === "enviando" ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3.5" />
                    {envio.erro}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setEnvios((prev) => prev.filter((e) => e.id !== envio.id))
                    }
                  >
                    <Trash2 />
                    <span className="sr-only">Descartar {envio.nome}</span>
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {anexos.length === 0 && envios.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {anexosPorDia.map((grupo) => (
            <div key={grupo.dia} className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground">
                {formatarYmd(grupo.dia)}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {grupo.itens.map((anexo) => {
                  const abreInline = tipoPreview(anexo.mime) !== null;
                  return (
                    <li
                      key={anexo.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                    >
                      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{anexo.nomeOriginal}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {formatarTamanho(anexo.tamanho)} ·{" "}
                          {formatarHora(anexo.createdAt)}
                          {mostrarOrigem && anexo.origem === "PACIENTE" && (
                            <Badge variant="secondary">Enviado pelo paciente</Badge>
                          )}
                        </p>
                      </div>
                      {anexo.url && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={anexo.url}
                            target={abreInline ? "_blank" : undefined}
                            rel="noreferrer"
                          >
                            {abreInline ? <ExternalLink /> : <Download />}
                            {abreInline ? "Abrir" : "Baixar"}
                          </a>
                        </Button>
                      )}
                      {permitirExcluir &&
                        (confirmandoId === anexo.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={removendoId === anexo.id}
                              onClick={() => setConfirmandoId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={removendoId === anexo.id}
                              onClick={() => excluir(anexo.id)}
                            >
                              {removendoId === anexo.id && (
                                <Loader2 className="animate-spin" />
                              )}
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setConfirmandoId(anexo.id)}
                          >
                            <Trash2 className="text-destructive" />
                            <span className="sr-only">
                              Excluir {anexo.nomeOriginal}
                            </span>
                          </Button>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
