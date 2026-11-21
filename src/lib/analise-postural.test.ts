import { describe, expect, it } from "vitest";
import { anotacoesSchema, anotacoesVazias, inclinacaoGraus, type Forma } from "./anotacoes-imagem";
import {
  desvioVerticalGraus,
  maiorDesvio,
  normalizarPonto,
  respostaParaFormas,
  resultadoAnaliseSchema,
  substituirFormasIa,
  type ResultadoAnalise,
} from "./analise-postural";

const COR = "#ef4444";
const ctx = { ...anotacoesVazias(1000, 1000), cor: COR };

const porId = (formas: Forma[], id: string) => formas.find((f) => f.id === id);
const texto = (formas: Forma[], id: string) => {
  const f = porId(formas, id);
  return f?.tipo === "texto" ? f.texto : undefined;
};

/** As formas geradas precisam passar no mesmo schema usado ao salvar. */
function validarSalvavel(formas: Forma[]) {
  expect(anotacoesSchema.safeParse({ ...anotacoesVazias(1000, 1000), formas }).success).toBe(true);
}

describe("normalizarPonto", () => {
  it("converte 0–1000 para 0..1 e limita ao quadro", () => {
    expect(normalizarPonto({ x: 250, y: 500 })).toEqual({ x: 0.25, y: 0.5 });
    expect(normalizarPonto({ x: -20, y: 1200 })).toEqual({ x: 0, y: 1 });
  });
});

describe("resultadoAnaliseSchema", () => {
  it("aceita vista frontal com pontos parciais", () => {
    const r = resultadoAnaliseSchema.safeParse({
      vista: "anterior",
      confianca: 0.9,
      pontos: { ombro_direito: { x: 1, y: 2 } },
    });
    expect(r.success).toBe(true);
  });

  it("recusa vista desconhecida e ponto malformado", () => {
    expect(resultadoAnaliseSchema.safeParse({ vista: "obliqua", confianca: 1 }).success).toBe(false);
    expect(
      resultadoAnaliseSchema.safeParse({
        vista: "anterior",
        confianca: 1,
        pontos: { ombro_direito: { x: "a" } },
      }).success,
    ).toBe(false);
  });
});

describe("vista anterior", () => {
  const resultado: ResultadoAnalise = {
    vista: "anterior",
    confianca: 0.95,
    pontos: {
      cabeca_direita: { x: 450, y: 150 },
      cabeca_esquerda: { x: 550, y: 150 },
      // Direito do paciente à esquerda da imagem, 20px mais baixo.
      ombro_direito: { x: 300, y: 320 },
      ombro_esquerdo: { x: 700, y: 300 },
      pelve_direita: { x: 400, y: 600 },
      pelve_esquerda: { x: 600, y: 600 },
    },
  };
  const { formas, ausentes } = respostaParaFormas(resultado, ctx);

  it("desenha ombros, pelve, cabeça e tronco com ids ia- e a cor escolhida", () => {
    for (const id of ["ia-ombros", "ia-pelve", "ia-cabeca", "ia-tronco", "ia-tronco-ref"]) {
      expect(porId(formas, id), id).toBeDefined();
    }
    expect(formas.every((f) => f.id.startsWith("ia-"))).toBe(true);
    expect(porId(formas, "ia-ombros")?.cor).toBe(COR);
    expect(ausentes).toEqual([]);
    validarSalvavel(formas);
  });

  it("o ângulo dos ombros é o calculado pelo nosso código (inclinacao)", () => {
    const f = porId(formas, "ia-ombros");
    expect(f?.tipo).toBe("inclinacao");
    if (f?.tipo !== "inclinacao") return;
    expect(inclinacaoGraus(f.a, f.b, 1000, 1000)).toBeCloseTo(
      (Math.atan2(20, 400) * 180) / Math.PI,
    );
  });

  it("indica o lado mais baixo e pares nivelados", () => {
    expect(texto(formas, "ia-ombros-txt")).toBe("Ombros: D mais baixo");
    expect(texto(formas, "ia-pelve-txt")).toBe("Pelve: nivelados");
  });

  it("tronco: desvio em relação à vertical, com o lado do paciente", () => {
    // meio ombros (500, 310), meio pelve (500, 600) → alinhado
    expect(texto(formas, "ia-tronco-txt")).toBe("Tronco: 0,0° (alinhado)");
    const inclinado = respostaParaFormas(
      {
        ...resultado,
        pontos: { ...resultado.pontos, ombro_direito: { x: 200, y: 300 }, ombro_esquerdo: { x: 600, y: 300 } },
      },
      ctx,
    );
    // meio dos ombros 100px para a ESQUERDA da imagem = direita do paciente na anterior
    expect(texto(inclinado.formas, "ia-tronco-txt")).toMatch(/^Tronco: \d+,\d° p\/ D$/);
  });

  it("não desenha coluna na anterior", () => {
    expect(porId(formas, "ia-coluna")).toBeUndefined();
  });
});

describe("vista posterior", () => {
  const coluna = [
    { x: 500, y: 200 },
    { x: 510, y: 300 },
    { x: 540, y: 400 }, // maior desvio: 40px para a direita da imagem
    { x: 515, y: 500 },
    { x: 500, y: 600 },
  ];
  const resultado: ResultadoAnalise = {
    vista: "posterior",
    confianca: 0.9,
    pontos: {
      ombro_direito: { x: 700, y: 300 },
      ombro_esquerdo: { x: 300, y: 300 },
      pelve_direita: { x: 600, y: 600 },
      pelve_esquerda: { x: 400, y: 600 },
      coluna: [...coluna].reverse(), // ordem trocada: o código ordena de cima para baixo
    },
  };

  it("desenha a linha da coluna e o desvio máximo em px", () => {
    const { formas, ausentes } = respostaParaFormas(resultado, ctx);
    const linha = porId(formas, "ia-coluna");
    expect(linha?.tipo).toBe("livre");
    if (linha?.tipo === "livre") expect(linha.pontos[0].y).toBeCloseTo(0.2);
    // Na posterior, direita da imagem = direita do paciente.
    expect(texto(formas, "ia-coluna-txt")).toBe("Coluna: desvio máx. 40 px p/ D");
    expect(ausentes).toEqual(["cabeça"]);
    validarSalvavel(formas);
  });

  it("usa cm quando a imagem está calibrada", () => {
    const calibrado = {
      ...ctx,
      calibracao: { a: { x: 0, y: 0 }, b: { x: 0.1, y: 0 }, cm: 10 }, // 100px = 10cm
    };
    const { formas } = respostaParaFormas(resultado, calibrado);
    expect(texto(formas, "ia-coluna-txt")).toBe("Coluna: desvio máx. 4,0 cm p/ D");
  });

  it("coluna com menos de 3 pontos fica de fora e é listada", () => {
    const { formas, ausentes } = respostaParaFormas(
      { ...resultado, pontos: { ...resultado.pontos, coluna: coluna.slice(0, 2) } },
      ctx,
    );
    expect(porId(formas, "ia-coluna")).toBeUndefined();
    expect(ausentes).toContain("coluna");
  });
});

describe("ponto ausente", () => {
  it("omite só a marcação dependente e lista o que faltou", () => {
    const { formas, ausentes } = respostaParaFormas(
      {
        vista: "anterior",
        confianca: 0.8,
        pontos: { ombro_direito: { x: 300, y: 300 }, ombro_esquerdo: { x: 700, y: 300 } },
      },
      ctx,
    );
    expect(porId(formas, "ia-ombros")).toBeDefined();
    expect(porId(formas, "ia-pelve")).toBeUndefined();
    expect(porId(formas, "ia-tronco")).toBeUndefined();
    expect(ausentes).toEqual(["cabeça", "pelve", "eixo do tronco"]);
  });
});

describe("vista lateral", () => {
  const pontos = {
    trago: { x: 560, y: 120 },
    acromio: { x: 520, y: 250 },
    trocanter: { x: 500, y: 520 },
    joelho: { x: 505, y: 750 },
    maleolo: { x: 500, y: 950 },
  };

  it("desenha prumo a partir do maléolo, alinhamento e medida da cabeça", () => {
    const { formas, ausentes } = respostaParaFormas(
      { vista: "lateral_direita", confianca: 0.9, pontos },
      ctx,
    );
    const prumo = porId(formas, "ia-prumo");
    expect(prumo?.tipo).toBe("linha");
    if (prumo?.tipo === "linha") {
      expect(prumo.a).toEqual({ x: 0.5, y: 0.95 });
      expect(prumo.b.x).toBe(0.5); // vertical
      expect(prumo.b.y).toBeLessThan(0.12);
    }
    const alinhamento = porId(formas, "ia-alinhamento");
    expect(alinhamento?.tipo === "livre" && alinhamento.pontos.length).toBe(5);
    expect(porId(formas, "ia-cabeca")?.tipo).toBe("medida");
    // Lateral direita: paciente olha para a direita da imagem; trago 60px à direita do prumo.
    expect(texto(formas, "ia-cabeca-txt")).toBe("Cabeça à frente do prumo");
    expect(ausentes).toEqual([]);
    validarSalvavel(formas);
  });

  it("na lateral esquerda o mesmo deslocamento é para trás", () => {
    const { formas } = respostaParaFormas({ vista: "lateral_esquerda", confianca: 0.9, pontos }, ctx);
    expect(texto(formas, "ia-cabeca-txt")).toBe("Cabeça atrás do prumo");
  });

  it("sem maléolo não há prumo", () => {
    const { formas, ausentes } = respostaParaFormas(
      { vista: "lateral_direita", confianca: 0.9, pontos: { ...pontos, maleolo: undefined } },
      ctx,
    );
    expect(porId(formas, "ia-prumo")).toBeUndefined();
    expect(ausentes).toEqual(["tornozelo (maléolo)"]);
  });
});

describe("não postural", () => {
  it("não gera formas", () => {
    expect(respostaParaFormas({ vista: "nao_postural", confianca: 0.99 }, ctx)).toEqual({
      formas: [],
      ausentes: [],
    });
  });
});

describe("substituirFormasIa", () => {
  it("troca só as formas ia- e mantém as feitas à mão", () => {
    const manual: Forma = { id: "f1", cor: COR, tipo: "linha", a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
    const velha: Forma = { ...manual, id: "ia-ombros" };
    const nova: Forma = { ...manual, id: "ia-pelve" };
    expect(substituirFormasIa([manual, velha], [nova]).map((f) => f.id)).toEqual(["f1", "ia-pelve"]);
  });
});

describe("geometria", () => {
  it("desvioVerticalGraus: 0 na vertical, 45 na diagonal, 90 na horizontal", () => {
    expect(desvioVerticalGraus({ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.1 }, 100, 100)).toBe(0);
    expect(desvioVerticalGraus({ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, 100, 100)).toBeCloseTo(45);
    expect(desvioVerticalGraus({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 100, 100)).toBe(90);
  });

  it("maiorDesvio precisa de 3 pontos e mede a perpendicular", () => {
    expect(maiorDesvio([{ x: 0, y: 0 }, { x: 0, y: 1 }], 100, 100)).toBeNull();
    const d = maiorDesvio(
      [
        { x: 0.5, y: 0 },
        { x: 0.6, y: 0.5 },
        { x: 0.5, y: 1 },
      ],
      100,
      100,
    );
    expect(d?.px).toBeCloseTo(10);
    expect(d?.pe).toEqual({ x: 0.5, y: 0.5 });
  });
});
