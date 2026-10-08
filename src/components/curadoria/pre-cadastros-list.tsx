import Link from "next/link";
import { MessageCircle, UserCheck } from "lucide-react";
import { listPreCadastros } from "@/actions/pre-cadastros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { RejeitarDialog } from "@/components/curadoria/rejeitar-dialog";
import { formatarDataHora } from "@/lib/format";
import { mascararCelular } from "@/lib/telefone";
import { montarLinkWhatsapp } from "@/lib/whatsapp";
import { PreCadastroVisualizarDialog } from "@/components/curadoria/pre-cadastro-visualizar-dialog";
import type { StatusPreCadastro } from "@/generated/prisma/client";

const VAZIO: Record<StatusPreCadastro, string> = {
  PENDENTE: "Nenhum pré-cadastro aguardando curadoria.",
  REJEITADO: "Nenhum pré-cadastro rejeitado.",
  APROVADO: "Nenhum pré-cadastro aprovado.",
};

export async function PreCadastrosList({
  status,
  page,
  search,
}: {
  status: StatusPreCadastro;
  page: number;
  search: string;
}) {
  const { itens, total, totalPages } = await listPreCadastros(
    { status, q: search },
    page,
  );

  if (itens.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {VAZIO[status]}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} registro{total !== 1 ? "s" : ""}
        {status === "PENDENTE" ? " na fila, do mais antigo ao mais recente" : ""}
      </p>

      {itens.map((item) => {
        const nomeCompleto = `${item.nome} ${item.sobrenome}`;
        const whatsapp = montarLinkWhatsapp(
          item.celular,
          `Olá, ${item.nome}! Recebemos seu pré-cadastro e gostaríamos de conversar com você.`,
        );
        return (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">{nomeCompleto}</h2>
                  <p className="text-sm text-muted-foreground">
                    {mascararCelular(item.celular)} · enviado em{" "}
                    {formatarDataHora(item.createdAt)}
                  </p>
                </div>
                {status !== "PENDENTE" && item.analisadoEm && (
                  <Badge
                    variant={status === "APROVADO" ? "default" : "destructive"}
                  >
                    {status === "APROVADO" ? "Aprovado" : "Rejeitado"} em{" "}
                    {formatarDataHora(item.analisadoEm)}
                  </Badge>
                )}
              </div>

              <p className="text-xs font-medium uppercase text-muted-foreground">
                Queixa principal
              </p>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                {item.queixaPrincipal}
              </p>

              <div>
                <PreCadastroVisualizarDialog
                  nome={nomeCompleto}
                  celular={item.celular}
                  createdAt={item.createdAt}
                  queixaPrincipal={item.queixaPrincipal}
                  anexos={item.arquivos}
                />
              </div>

              {status === "REJEITADO" && item.motivoRejeicao && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Motivo:</span>{" "}
                  {item.motivoRejeicao}
                </p>
              )}

              {status === "APROVADO" && item.pacienteId && (
                <div>
                  <Button variant="outline" asChild>
                    <Link href={`/pacientes/${item.pacienteId}`}>
                      Ver paciente
                    </Link>
                  </Button>
                </div>
              )}

              {status === "PENDENTE" && (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    {whatsapp && (
                      <Button variant="outline" asChild>
                        <a href={whatsapp} target="_blank" rel="noreferrer">
                          <MessageCircle />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    <RejeitarDialog id={item.id} nome={nomeCompleto} />
                  </div>
                  <Button asChild>
                    <Link href={`/pacientes/novo?preCadastro=${item.id}`}>
                      <UserCheck />
                      Aprovar e cadastrar
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
