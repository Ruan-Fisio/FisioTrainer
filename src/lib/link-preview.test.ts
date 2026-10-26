import { describe, expect, it } from "vitest";
import { getLinkPreview } from "@/lib/link-preview";

describe("getLinkPreview", () => {
  it("detecta vídeo do YouTube e calcula thumbnailUrl", () => {
    const preview = getLinkPreview("https://www.youtube.com/watch?v=abc12345678");
    expect(preview).toEqual({
      type: "youtube",
      videoId: "abc12345678",
      thumbnailUrl: "https://img.youtube.com/vi/abc12345678/mqdefault.jpg",
      url: "https://www.youtube.com/watch?v=abc12345678",
    });
  });

  it("detecta link direto de imagem por extensão", () => {
    const preview = getLinkPreview("https://exemplo.com/fotos/exercicio.jpg");
    expect(preview).toEqual({
      type: "image",
      url: "https://exemplo.com/fotos/exercicio.jpg",
    });
  });

  it("detecta imagem com query string após a extensão", () => {
    const preview = getLinkPreview(
      "https://exemplo.com/fotos/exercicio.png?v=123",
    );
    expect(preview?.type).toBe("image");
  });

  it("cai no tipo site para links genéricos", () => {
    const preview = getLinkPreview("https://exemplo.com/pagina");
    expect(preview?.type).toBe("site");
  });

  it("retorna null para URL inválida", () => {
    expect(getLinkPreview("não é url")).toBeNull();
  });
});
