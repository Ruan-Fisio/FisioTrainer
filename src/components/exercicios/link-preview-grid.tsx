import { ExternalLink, Link2 } from "lucide-react";
import { getLinkPreview } from "@/lib/link-preview";

function LinkTile({ url }: { url: string }) {
  const preview = getLinkPreview(url);

  if (preview?.type === "youtube") {
    return (
      <div className="flex flex-col gap-2">
        <div className="aspect-square w-full overflow-hidden rounded-lg border bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${preview.videoId}`}
            title="Player de vídeo do YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{preview.url}</span>
        </a>
      </div>
    );
  }

  if (preview?.type === "site") {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border p-4 text-center hover:bg-muted/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.faviconUrl}
          alt=""
          className="size-10 shrink-0 rounded"
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{preview.domain}</p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
            <ExternalLink className="size-3" />
            Abrir link
          </p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center text-muted-foreground hover:bg-muted/50"
    >
      <Link2 className="size-6 shrink-0" />
      <span className="truncate text-xs">{url}</span>
    </a>
  );
}

export function LinkPreviewGrid({ urls }: { urls: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {urls.map((url) => (
        <LinkTile key={url} url={url} />
      ))}
    </div>
  );
}
