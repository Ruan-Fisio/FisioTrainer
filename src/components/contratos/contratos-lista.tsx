import Link from "next/link";
import { listContratos } from "@/actions/contratos";
import { ContratoAcoes } from "@/components/contratos/contrato-acoes";
import { ContratoStatusBadge } from "@/components/contratos/contrato-status-badge";
import { PaginationControls } from "@/components/filters/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarNumeroContrato } from "@/lib/contrato-regras";
import { formatarData } from "@/lib/format";
import type { StatusContrato } from "@/generated/prisma/client";

/** Contrato de paciente excluído continua aqui, mas a tela do paciente não existe mais. */
function NomePaciente({
  contrato,
}: {
  contrato: { pacienteId: string; paciente: { nome: string; excluidoEm: Date | null } };
}) {
  if (contrato.paciente.excluidoEm) {
    return (
      <span className="font-medium">
        {contrato.paciente.nome}{" "}
        <span className="text-xs font-normal text-muted-foreground">(paciente excluído)</span>
      </span>
    );
  }
  return (
    <Link href={`/pacientes/${contrato.pacienteId}?tab=planos`} className="font-medium hover:underline">
      {contrato.paciente.nome}
    </Link>
  );
}

export async function ContratosLista({
  page,
  search,
  status,
}: {
  page: number;
  search: string;
  status: StatusContrato[];
}) {
  const { itens, total, totalPages } = await listContratos({ q: search, status }, page);

  if (itens.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum contrato encontrado. Eles são gerados quando um plano é atribuído a um paciente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} contrato{total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {itens.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <NomePaciente contrato={c} />
                <ContratoStatusBadge status={c.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatarNumeroContrato(c.numero)} · {c.planoAtribuicao.planoNome}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.assinadoEm
                  ? `Assinado em ${formatarData(c.assinadoEm)}`
                  : `Gerado em ${formatarData(c.createdAt)}`}
              </p>
              <ContratoAcoes
                contrato={c}
                paciente={c.paciente}
                planoNome={c.planoAtribuicao.planoNome}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{formatarNumeroContrato(c.numero)}</TableCell>
                <TableCell>
                  <NomePaciente contrato={c} />
                </TableCell>
                <TableCell>{c.planoAtribuicao.planoNome}</TableCell>
                <TableCell>
                  <ContratoStatusBadge status={c.status} />
                </TableCell>
                <TableCell>{formatarData(c.assinadoEm ?? c.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <ContratoAcoes
                      contrato={c}
                      paciente={c.paciente}
                      planoNome={c.planoAtribuicao.planoNome}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
