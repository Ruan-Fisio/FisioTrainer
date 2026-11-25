import { describe, expect, it } from "vitest";
import { encaixarNaCaixa, organizarAnexosRelatorio } from "./relatorio-imagens";

const exame = {
  secoes: [
    {
      nome: "Postura",
      campos: [
        { nome: "Fotos", repetivel: false, colunas: [{ id: "ant", titulo: "Anterior" }, { id: "post", titulo: "Posterior" }] },
      ],
    },
    {
      nome: "Exames",
      campos: [{ nome: "", repetivel: true, colunas: [{ id: "laudo", titulo: "Laudo" }] }],
    },
  ],
};

describe("organizarAnexosRelatorio", () => {
  const { imagens, outros } = organizarAnexosRelatorio(exame, [
    { colunaId: "laudo", linha: 1, nomeOriginal: "raio-x.jpg", mime: "image/jpeg" },
    { colunaId: "post", linha: 0, nomeOriginal: "costas.png", mime: "image/png" },
    { colunaId: "sumiu", linha: 0, nomeOriginal: "antiga.jpg", mime: "image/jpeg" },
    { colunaId: "laudo", linha: 0, nomeOriginal: "laudo.pdf", mime: "application/pdf" },
    { colunaId: "ant", linha: 0, nomeOriginal: "frente.jpg", mime: "image/jpeg" },
  ]);

  it("ordena pela ordem do exame e manda coluna removida para o fim", () => {
    expect(imagens.map((i) => i.nomeOriginal)).toEqual([
      "frente.jpg",
      "costas.png",
      "raio-x.jpg",
      "antiga.jpg",
    ]);
  });

  it("legenda com seção, campo, coluna e entrada (só em campo repetível)", () => {
    expect(imagens.map((i) => i.legenda)).toEqual([
      "Postura — Fotos — Anterior",
      "Postura — Fotos — Posterior",
      "Exames — Laudo (entrada 2)",
      "antiga.jpg",
    ]);
  });

  it("arquivos que não são imagem ficam em outros", () => {
    expect(outros).toEqual([
      expect.objectContaining({ nomeOriginal: "laudo.pdf", legenda: "Exames — Laudo (entrada 1)" }),
    ]);
  });
});

describe("encaixarNaCaixa", () => {
  it("mantém a proporção no limite mais apertado", () => {
    expect(encaixarNaCaixa(1000, 2000, 250, 330)).toEqual({ largura: 165, altura: 330 });
    expect(encaixarNaCaixa(2000, 1000, 250, 330)).toEqual({ largura: 250, altura: 125 });
  });
});
