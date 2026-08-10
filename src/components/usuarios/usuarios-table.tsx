import { listUsuarios } from "@/actions/usuarios";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsuarioRowActions } from "@/components/usuarios/usuario-row-actions";
import { UsuariosPagination } from "@/components/usuarios/usuarios-pagination";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function UsuariosTable({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  const { usuarios, total, totalPages } = await listUsuarios(page, search);

  if (usuarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {total} usuário{total !== 1 ? "s" : ""} encontrado
        {total !== 1 ? "s" : ""}
      </p>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {usuarios.map((usuario) => (
          <Card key={usuario.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(usuario.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{usuario.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {usuario.email}
                </p>
              </div>
              <UsuarioRowActions id={usuario.id} name={usuario.name} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="flex items-center gap-3 font-medium">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(usuario.name)}
                    </AvatarFallback>
                  </Avatar>
                  {usuario.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {usuario.email}
                </TableCell>
                <TableCell>
                  <UsuarioRowActions id={usuario.id} name={usuario.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UsuariosPagination page={page} totalPages={totalPages} />
    </div>
  );
}
