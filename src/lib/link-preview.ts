export type LinkPreview =
  | { type: "youtube"; videoId: string; thumbnailUrl: string; url: string }
  | { type: "site"; domain: string; faviconUrl: string; url: string };

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
];

export function getLinkPreview(url: string): LinkPreview | null {
  try {
    const parsed = new URL(url);

    for (const pattern of YOUTUBE_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        const videoId = match[1];
        return {
          type: "youtube",
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          url,
        };
      }
    }

    return {
      type: "site",
      domain: parsed.hostname.replace(/^www\./, ""),
      faviconUrl: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
      url,
    };
  } catch {
    return null;
  }
}
