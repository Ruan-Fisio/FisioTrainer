import { describe, expect, it } from "vitest";
import { parseImagensForm } from "./exame-imagens";

function fd(imagens?: unknown, removidas?: unknown) {
  const f = new FormData();
  if (imagens !== undefined) f.set("imagens", JSON.stringify(imagens));
  if (removidas !== undefined) f.set("imagensRemovidas", JSON.stringify(removidas));
  return f;
}

describe("parseImagensForm", () => {
  it("lê imagens novas e removidas", () => {
    const r = parseImagensForm(
      fd([{ chave: "tmp/pacientes/p/u.png", colunaId: "c", linha: 1, nomeOriginal: "a.png" }], ["i1"]),
    );
    expect(r.imagens).toHaveLength(1);
    expect(r.removidas).toEqual(["i1"]);
  });
  it("sem campos ou JSON inválido vira vazio", () => {
    expect(parseImagensForm(new FormData())).toEqual({ imagens: [], removidas: [] });
    const f = new FormData();
    f.set("imagens", "{nope");
    expect(parseImagensForm(f)).toEqual({ imagens: [], removidas: [] });
  });
  it("payload com formato errado é descartado inteiro", () => {
    expect(parseImagensForm(fd([{ chave: "x", linha: -1 }], []))).toEqual({
      imagens: [],
      removidas: [],
    });
  });
});
