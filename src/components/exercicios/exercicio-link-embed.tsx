import { getLinkPreview } from "@/lib/link-preview";
import { LinkPreviewCard } from "@/components/exercicios/link-preview-card";

export function ExercicioLinkEmbed({ url }: { url: string }) {
  const preview = getLinkPreview(url);

  if (preview?.type === "youtube") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${preview.videoId}`}
          title="Vídeo do exercício"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return <LinkPreviewCard url={url} />;
}
