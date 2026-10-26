"use client";

import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ExercicioRowActions } from "@/components/exercicios/exercicio-row-actions";
import { getLinkPreview } from "@/lib/link-preview";

type ExercicioListItemProps = {
  id: string;
  name: string;
  categorias: { id: string; name: string }[];
  linksCount: number;
  previewUrl?: string;
};

function ExercicioThumbnail({
  previewUrl,
  className,
}: {
  previewUrl?: string;
  className: string;
}) {
  const preview = previewUrl ? getLinkPreview(previewUrl) : null;

  if (preview?.type === "youtube") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preview.thumbnailUrl}
        alt=""
        className={`${className} object-cover`}
      />
    );
  }

  if (preview?.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preview.url}
        alt=""
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-muted text-muted-foreground`}
    >
      <Link2 className="size-4" />
    </div>
  );
}

export function ExercicioTableRow({
  id,
  name,
  categorias,
  linksCount,
  previewUrl,
}: ExercicioListItemProps) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/biblioteca/exercicios/${id}`)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <ExercicioThumbnail
            previewUrl={previewUrl}
            className="size-10 shrink-0 rounded border"
          />
          {name}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {categorias.map((categoria) => (
            <Badge key={categoria.id} variant="secondary">
              {categoria.name}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link2 className="size-3.5" />
          {linksCount}
        </div>
      </TableCell>
      <TableCell>
        <ExercicioRowActions id={id} name={name} />
      </TableCell>
    </TableRow>
  );
}

export function ExercicioCard({
  id,
  name,
  categorias,
  linksCount,
  previewUrl,
}: ExercicioListItemProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer"
      onClick={() => router.push(`/biblioteca/exercicios/${id}`)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <ExercicioThumbnail
              previewUrl={previewUrl}
              className="size-12 shrink-0 rounded border"
            />
            <p className="font-medium">{name}</p>
          </div>
          <ExercicioRowActions id={id} name={name} />
        </div>
        <div className="flex flex-wrap gap-1">
          {categorias.map((categoria) => (
            <Badge key={categoria.id} variant="secondary">
              {categoria.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="size-3.5" />
          {linksCount} link{linksCount !== 1 ? "s" : ""}
        </div>
      </CardContent>
    </Card>
  );
}
