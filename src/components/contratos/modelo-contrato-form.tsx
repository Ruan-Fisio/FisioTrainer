"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, PencilLine, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  salvarModeloContrato,
  type ModeloContratoState,
} from "@/actions/contratos";
import { ContratoTexto } from "@/components/contratos/contrato-texto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormActions } from "@/components/ui/form-actions";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRATO_MODELO_PADRAO,
  GRUPOS_VARIAVEIS,
  VARIAVEIS_EXEMPLO,
  renderizarModelo,
} from "@/lib/contrato-modelo";

export function ModeloContratoForm({
  versao,
  conteudo: conteudoSalvo,
  contratadaId: contratadaSalva,
  usuarios,
}: {
  versao: number;
  conteudo: string;
  contratadaId: string;
  usuarios: { id: string; name: string; razaoSocial: string | null; cpfCnpj: string | null }[];
}) {
  const [conteudo, setConteudo] = useState(conteudoSalvo);
  const [contratadaId, setContratadaId] = useState(contratadaSalva);
  const [previa, setPrevia] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, action] = useActionState<ModeloContratoState, FormData>(
    salvarModeloContrato,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.success) toast.success(`Modelo salvo (versão ${state.versao}).`);
  }, [state]);

  function inserirVariavel(chave: string) {
    const trecho = `{{${chave}}}`;
    const campo = textareaRef.current;
    const inicio = campo?.selectionStart ?? conteudo.length;
    const fim = campo?.selectionEnd ?? conteudo.length;
    setConteudo(conteudo.slice(0, inicio) + trecho + conteudo.slice(fim));
    requestAnimationFrame(() => {
      campo?.focus();
      campo?.setSelectionRange(inicio + trecho.length, inicio + trecho.length);
    });
  }

  return (
    <form action={action} className="flex flex-col gap-4 pb-24">
      <Card>
        <CardContent className="flex flex-col gap-1.5">
          <Label htmlFor="contratadaId">Contratada (dados que entram no contrato)</Label>
          <NativeSelect
            id="contratadaId"
            name="contratadaId"
            value={contratadaId}
            onChange={(e) => setContratadaId(e.target.value)}
          >
            <option value="">Selecione</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.razaoSocial || u.name} ({u.cpfCnpj})
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            Só aparecem usuários com CPF/CNPJ. Os dados são editados em{" "}
            <Link href="/usuarios" className="underline">
              Usuários
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label htmlFor="conteudo">Texto do contrato</Label>
                <p className="text-xs text-muted-foreground">
                  {versao === 0 ? "Modelo sugerido, ainda não salvo" : `Versão ${versao}`}. Use
                  &quot;# &quot; para título e &quot;## &quot; para seção.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConteudo(CONTRATO_MODELO_PADRAO)}
                >
                  <RotateCcw />
                  Usar modelo sugerido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrevia(!previa)}
                >
                  {previa ? <PencilLine /> : <Eye />}
                  {previa ? "Editar" : "Pré-visualizar"}
                </Button>
              </div>
            </div>

            {/* O campo continua no formulário durante a prévia, para ser enviado ao salvar. */}
            <Textarea
              id="conteudo"
              name="conteudo"
              ref={textareaRef}
              rows={28}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className={previa ? "hidden" : "font-mono text-xs leading-relaxed"}
            />
            {previa && (
              <div className="rounded-lg border bg-background p-4" data-testid="previa-contrato">
                <p className="mb-3 text-xs text-muted-foreground">
                  Prévia com dados fictícios.
                </p>
                <ContratoTexto conteudo={renderizarModelo(conteudo, VARIAVEIS_EXEMPLO)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold">Variáveis</h2>
              <p className="text-xs text-muted-foreground">
                Clique para inserir no ponto em que o cursor está.
              </p>
            </div>
            {GRUPOS_VARIAVEIS.map((grupo) => (
              <div key={grupo.titulo} className="flex flex-col gap-1">
                <h3 className="text-xs font-medium text-muted-foreground">{grupo.titulo}</h3>
                {grupo.variaveis.map((v) => (
                  <button
                    key={v.chave}
                    type="button"
                    disabled={previa}
                    onClick={() => inserirVariavel(v.chave)}
                    className="rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  >
                    {v.descricao}
                  </button>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <FormActions
        submitLabel="Salvar nova versão"
        cancelLabel="Descartar alterações"
        onCancel={() => {
          setConteudo(conteudoSalvo);
          setContratadaId(contratadaSalva);
        }}
      />
    </form>
  );
}
