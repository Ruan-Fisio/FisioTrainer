import { listClientes } from "@/actions/clientes";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClienteTableRow,
  ClienteCard,
} from "@/components/clientes/cliente-list-item";
import { PaginationControls } from "@/components/filters/pagination-controls";

export async function ClientesTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { clientes, total, totalPages } = await listClientes(
    { q: search },
    page,
  );

  if (clientes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} cliente{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {clientes.map((cliente) => (
          <ClienteCard
            key={cliente.id}
            id={cliente.id}
            nome={cliente.nome}
            idade={cliente.idade}
            contato={cliente.contato}
            execucoesCount={cliente._count.execucoes}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Exames</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((cliente) => (
              <ClienteTableRow
                key={cliente.id}
                id={cliente.id}
                nome={cliente.nome}
                idade={cliente.idade}
                contato={cliente.contato}
                execucoesCount={cliente._count.execucoes}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} />
    </div>
  );
}
