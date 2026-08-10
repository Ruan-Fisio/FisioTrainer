import { ExternalLink, Link2 } from "lucide-react";
import { getLinkPreview } from "@/lib/link-preview";

export function LinkPreviewCard({ url }: { url: string }) {
  const preview = getLinkPreview(url);

  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md border p-2 text-sm text-muted-foreground hover:bg-muted/50"
      >
        <Link2 className="size-4 shrink-0" />
        <span className="truncate">{url}</span>
      </a>
    );
  }

  if (preview.type === "youtube") {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-md border p-2 hover:bg-muted/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.thumbnailUrl}
          alt="Thumbnail do vídeo"
          className="h-12 w-20 shrink-0 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">YouTube</p>
          <p className="truncate text-xs text-muted-foreground">
            {preview.url}
          </p>
        </div>
        <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-md border p-2 hover:bg-muted/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview.faviconUrl}
        alt=""
        className="size-8 shrink-0 rounded"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{preview.domain}</p>
        <p className="truncate text-xs text-muted-foreground">
          {preview.url}
        </p>
      </div>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </a>
  );
}
