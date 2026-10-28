import { describe, expect, it } from "vitest";
import type { ColunaDraft, ExameDraft, SecaoDraft } from "./exame-draft";
import {
  comporMapas,
  iguais,
  mapaDeOrigem,
  mesclarExame,
  mesclarLista,
  mesclarTabela,
  mesclarValor,
  remapearSecoes,
} from "./exame-merge";
import type { TabelaReferencia } from "./tabela-referencia";

function coluna(id: string, patch: Partial<ColunaDraft> = {}): ColunaDraft {
  return {
    id,
    titulo: id,
    tipo: "NUMERO",
    formatacao: "",
    opcoes: [],
    multiplaSelecao: false,
    opcoesCondicionais: [],
    coresOpcoes: [],
    usaPontuacao: false,
    pontuacoes: [],
    permiteAnexo: false,
    valorIdeal: "",
    direcaoIdeal: "PROXIMO_IDEAL",
    formula: "",
    ...patch,
  };
}

function secao(id: string, colunas: ColunaDraft[]): SecaoDraft {
  return {
    id,
    nome: id,
    campos: [{ id: `${id}-campo`, nome: "Campo", repetivel: false, identificarMembro: false, colunas }],
  };
}

function tabela(id: string, nome: string, linhas = 1): TabelaReferencia {
  return {
    id,
    nome,
    chaves: ["Idade"],
    saidas: ["Valor"],
    linhas: Array.from({ length: linhas }, (_, i) => ({
      faixas: [{ min: String(i), max: String(i) }],
      valores: [String(i)],
    })),
  };
}

function exame(patch: Partial<ExameDraft> = {}): ExameDraft {
  return {
    nome: "RIE-FIT",
    descricao: "",
    tipo: "EDUCACAO_FISICA",
    sombra: false,
    variaveis: [],
    tabelas: [],
    secoes: [secao("s1", [coluna("peso")])],
    ...patch,
  };
}

describe("iguais", () => {
  it("ignora a ordem das chaves e propriedades undefined", () => {
    expect(iguais({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(iguais({ a: 1, id: undefined }, { a: 1 })).toBe(true);
    expect(iguais([1, 2], [2, 1])).toBe(false);
  });
});

describe("mesclarValor", () => {
  it("vale o meu se eu mudei (mesmo que eles também), senão o deles", () => {
    expect(mesclarValor("a", "a", "b")).toBe("b");
    expect(mesclarValor("a", "m", "a")).toBe("m");
    expect(mesclarValor("a", "m", "d")).toBe("m");
  });
});

describe("mesclarExame — caso real: duas pessoas editando tabelas diferentes", () => {
  const base = exame({ tabelas: [tabela("wells", "Wells"), tabela("flex", "Flexões", 1)] });

  it("Ruan edita Flexões e Diogo cria Impulsão: as duas mudanças ficam", () => {
    const ruan = exame({ tabelas: [tabela("wells", "Wells"), tabela("flex", "Flexões", 12)] });
    const diogo = exame({
      tabelas: [tabela("wells", "Wells"), tabela("flex", "Flexões", 1), tabela("imp", "Impulsão")],
    });

    // Diogo salvou primeiro; Ruan sincroniza com a base antiga.
    const resultado = mesclarExame(base, ruan, diogo);
    expect(resultado.tabelas.map((t) => [t.nome, t.linhas.length])).toEqual([
      ["Wells", 1],
      ["Flexões", 12],
      ["Impulsão", 1],
    ]);
  });

  it("eles apagam uma tabela que eu não toquei: some; que eu editei: fica", () => {
    const deles = exame({ tabelas: [tabela("flex", "Flexões")] });
    expect(mesclarExame(base, base, deles).tabelas.map((t) => t.id)).toEqual(["flex"]);

    const minha = exame({ tabelas: [tabela("wells", "Wells", 9), tabela("flex", "Flexões")] });
    expect(mesclarExame(base, minha, deles).tabelas.map((t) => t.id)).toEqual(["wells", "flex"]);
  });

  it("eu apago uma tabela: some mesmo que eles tenham editado (meu salvamento é o mais recente)", () => {
    const minha = exame({ tabelas: [tabela("flex", "Flexões")] });
    const deles = exame({ tabelas: [tabela("wells", "Wells", 7), tabela("flex", "Flexões")] });
    expect(mesclarExame(base, minha, deles).tabelas.map((t) => t.id)).toEqual(["flex"]);
  });

  it("tabela sem id gravado casa pelo nome (id legado)", () => {
    const semId = (t: TabelaReferencia) => ({ ...t, id: undefined });
    const b = exame({ tabelas: [semId(tabela("x", "Wells"))] });
    const m = exame({ tabelas: [semId(tabela("x", "Wells", 4))] });
    const d = exame({ tabelas: [semId(tabela("x", "Wells")), tabela("novo", "Nova")] });
    expect(mesclarExame(b, m, d).tabelas.map((t) => [t.nome, t.linhas.length])).toEqual([
      ["Wells", 4],
      ["Nova", 1],
    ]);
  });
});

describe("mesclarExame — campos simples, seções e colunas", () => {
  it("campos do exame se mesclam um a um", () => {
    const base = exame();
    const minha = exame({ nome: "Novo nome" });
    const deles = exame({ descricao: "Nova descrição", sombra: true });
    const r = mesclarExame(base, minha, deles);
    expect([r.nome, r.descricao, r.sombra]).toEqual(["Novo nome", "Nova descrição", true]);
  });

  it("mudanças em colunas diferentes da mesma seção se somam, campo a campo", () => {
    const base = exame({ secoes: [secao("s1", [coluna("peso"), coluna("altura")])] });
    const minha = exame({
      secoes: [secao("s1", [coluna("peso", { titulo: "Massa" }), coluna("altura")])],
    });
    const deles = exame({
      secoes: [secao("s1", [coluna("peso", { valorIdeal: "70" }), coluna("altura", { titulo: "Estatura" })])],
    });
    const colunas = mesclarExame(base, minha, deles).secoes[0].campos[0].colunas;
    expect(colunas.map((c) => [c.titulo, c.valorIdeal])).toEqual([
      ["Massa", "70"],
      ["Estatura", ""],
    ]);
  });

  it("opções, cores e pontos andam juntos (alinhados por índice)", () => {
    const multipla = (patch: Partial<ColunaDraft>) =>
      coluna("nivel", { tipo: "MULTIPLA_ESCOLHA", opcoes: ["A", "B"], coresOpcoes: ["", ""], ...patch });
    const base = exame({ secoes: [secao("s1", [multipla({})])] });
    const minha = exame({
      secoes: [secao("s1", [multipla({ opcoes: ["A", "B", "C"], coresOpcoes: ["", "", ""] })])],
    });
    const deles = exame({ secoes: [secao("s1", [multipla({ coresOpcoes: ["VERDE", "AZUL"] })])] });
    const col = mesclarExame(base, minha, deles).secoes[0].campos[0].colunas[0];
    expect(col.opcoes).toEqual(["A", "B", "C"]);
    expect(col.coresOpcoes).toEqual(["", "", ""]);
  });

  it("seções novas dos dois lados entram, cada uma depois do seu vizinho", () => {
    const base = exame({ secoes: [secao("s1", [coluna("a")]), secao("s2", [coluna("b")])] });
    const minha = exame({
      secoes: [secao("s1", [coluna("a")]), secao("minha", [coluna("m")]), secao("s2", [coluna("b")])],
    });
    const deles = exame({
      secoes: [secao("s1", [coluna("a")]), secao("s2", [coluna("b")]), secao("deles", [coluna("d")])],
    });
    expect(mesclarExame(base, minha, deles).secoes.map((s) => s.id)).toEqual([
      "s1",
      "minha",
      "s2",
      "deles",
    ]);
  });

  it("se eu reordenei, a minha ordem vence", () => {
    const base = exame({ secoes: [secao("s1", [coluna("a")]), secao("s2", [coluna("b")])] });
    const minha = exame({ secoes: [secao("s2", [coluna("b")]), secao("s1", [coluna("a")])] });
    const deles = exame({
      secoes: [secao("s1", [coluna("a", { titulo: "A2" })]), secao("s2", [coluna("b")])],
    });
    const r = mesclarExame(base, minha, deles);
    expect(r.secoes.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(r.secoes[1].campos[0].colunas[0].titulo).toBe("A2");
  });

  it("sem mudanças minhas, o resultado é exatamente o deles", () => {
    const base = exame();
    const deles = exame({ nome: "X", tabelas: [tabela("t", "T")] });
    expect(mesclarExame(base, base, deles)).toEqual(deles);
  });

  it("variáveis são uma unidade só", () => {
    const base = exame({ variaveis: [{ nome: "a", formula: "1" }] });
    const minha = exame({ variaveis: [{ nome: "a", formula: "2" }] });
    const deles = exame({ variaveis: [{ nome: "a", formula: "1" }, { nome: "b", formula: "3" }] });
    expect(mesclarExame(base, minha, deles).variaveis).toEqual(minha.variaveis);
  });
});

describe("mesclarLista", () => {
  it("item criado pelos dois com o mesmo id (sem base) fica com o meu", () => {
    const r = mesclarLista(
      [] as { id: string; v: number }[],
      [{ id: "x", v: 1 }],
      [{ id: "x", v: 2 }],
      (i) => i.id,
      mesclarValor,
    );
    expect(r).toEqual([{ id: "x", v: 1 }]);
  });
});

describe("remapearSecoes / comporMapas", () => {
  it("troca ids de seção, campo e coluna pelos da versão nova", () => {
    const [s] = remapearSecoes([secao("s1", [coluna("peso"), coluna("local")])], {
      s1: "S1",
      "s1-campo": "C1",
      peso: "P1",
    });
    expect([s.id, s.campos[0].id, ...s.campos[0].colunas.map((c) => c.id)]).toEqual([
      "S1",
      "C1",
      "P1",
      "local",
    ]);
  });

  it("compõe v1→v2 com v2→v3", () => {
    expect(comporMapas({ a: "b", x: "y" }, { b: "c", n: "m" })).toEqual({ a: "c", x: "y", b: "c", n: "m" });
  });
});

describe("mapaDeOrigem", () => {
  it("mapeia origemId → id de seções, campos e colunas, ignorando os sem origem", () => {
    expect(
      mapaDeOrigem([
        {
          id: "S2",
          origemId: "S1",
          campos: [
            {
              id: "C2",
              origemId: "C1",
              colunas: [
                { id: "K2", origemId: "K1" },
                { id: "M2", origemId: null },
              ],
            },
          ],
        },
      ]),
    ).toEqual({ S1: "S2", C1: "C2", K1: "K2" });
  });
});

describe("mesclarTabela — só conta como mudança o valor que mudou", () => {
  const base = tabela("t", "Flex", 3);
  const comCelula = (t: TabelaReferencia, linha: number, valor: string) => ({
    ...t,
    linhas: t.linhas.map((l, i) => (i === linha ? { ...l, valores: [valor] } : l)),
  });
  const comMax = (t: TabelaReferencia, linha: number, max: string) => ({
    ...t,
    linhas: t.linhas.map((l, i) => (i === linha ? { ...l, faixas: [{ ...l.faixas[0], max }] } : l)),
  });

  it("mandar a tabela inteira com valores iguais não sobrescreve nada do outro", () => {
    const deles = comCelula(base, 2, "99");
    expect(mesclarTabela(base, structuredClone(base), deles)).toEqual(deles);
  });

  it("células diferentes na mesma tabela: as duas mudanças ficam", () => {
    const minha = comCelula(base, 0, "10");
    const deles = comMax(base, 1, "50");
    const r = mesclarTabela(base, minha, deles);
    expect(r.linhas[0].valores).toEqual(["10"]);
    expect(r.linhas[1].faixas[0].max).toBe("50");
    expect(r.linhas[2]).toEqual(base.linhas[2]);
  });

  it("mesma célula alterada pelos dois: vale a minha (quem salva por último)", () => {
    const r = mesclarTabela(base, comCelula(base, 0, "10"), comCelula(base, 0, "20"));
    expect(r.linhas[0].valores).toEqual(["10"]);
  });

  it("eu acrescento linhas (ex. colando da planilha) e eles editam uma existente", () => {
    const minha = {
      ...base,
      linhas: [...base.linhas, { faixas: [{ min: "9", max: "9" }], valores: ["9"] }],
    };
    const r = mesclarTabela(base, minha, comCelula(base, 1, "77"));
    expect(r.linhas).toHaveLength(4);
    expect(r.linhas[1].valores).toEqual(["77"]);
    expect(r.linhas[3].valores).toEqual(["9"]);
  });

  it("eles acrescentam um resultado (coluna) e eu edito uma célula: a forma é a deles, minha célula entra", () => {
    const deles = {
      ...base,
      saidas: ["Valor", "Extra"],
      linhas: base.linhas.map((l) => ({ ...l, valores: [...l.valores, "x"] })),
    };
    const r = mesclarTabela(base, comCelula(base, 0, "10"), deles);
    expect(r.saidas).toEqual(["Valor", "Extra"]);
    expect(r.linhas[0].valores).toEqual(["10", "x"]);
    expect(r.linhas[1].valores).toEqual(["1", "x"]);
  });

  it("os dois mudaram as colunas: vale a tabela inteira de quem salva por último", () => {
    const minha = { ...base, chaves: ["Idade", "Sexo"], linhas: base.linhas.map((l) => ({ ...l, faixas: [...l.faixas, { min: "", max: "" }] })) };
    const deles = { ...base, saidas: ["Valor", "Extra"], linhas: base.linhas.map((l) => ({ ...l, valores: [...l.valores, "x"] })) };
    expect(mesclarTabela(base, minha, deles)).toEqual(minha);
  });

  it("renomear a tabela e editar uma célula, cada um de um lado", () => {
    const r = mesclarTabela(base, { ...base, nome: "Flexões" }, comCelula(base, 2, "5"));
    expect(r.nome).toBe("Flexões");
    expect(r.linhas[2].valores).toEqual(["5"]);
  });
});
