import { describe, expect, it } from "vitest";
import { anotacoesSchema, anotacoesVazias, quebrarLinhas, type Forma } from "./anotacoes-imagem";
import {
  COR_PROTOCOLO,
  apicesColuna,
  caixaColuna,
  desvioVerticalGraus,
  ladoPaciente,
  normalizarPonto,
  pontoDoRecorte,
  respostaParaFormas,
  resultadoAnaliseSchema,
  substituirFormasIa,
  suavizarCurva,
  type PontosAnterior,
  type PontosPosterior,
} from "./analise-postural";

const ctx = anotacoesVazias(1000, 1000);

const porId = (formas: Forma[], id: string) => formas.find((f) => f.id === id);
const rotuloDe = (formas: Forma[], id: string) => {
  const f = porId(formas, id);
  return f?.tipo === "rotulo" ? f : undefined;
};

/** As formas geradas precisam passar no mesmo schema usado ao salvar. */
function validarSalvavel(formas: Forma[]) {
  const r = anotacoesSchema.safeParse({ ...anotacoesVazias(1000, 1000), formas });
  expect(r.success, JSON.stringify(r.error?.issues?.[0])).toBe(true);
}

/** Posterior nivelado, corpo centrado em x=500. */
const POSTERIOR: PontosPosterior = {
  vertice: { x: 500, y: 20 },
  c7: { x: 500, y: 170 },
  acromio_direito: { x: 780, y: 200 },
  acromio_esquerdo: { x: 220, y: 200 },
  escapula_direita: { x: 650, y: 300 },
  escapula_esquerda: { x: 350, y: 300 },
  eips_direita: { x: 650, y: 440 },
  eips_esquerda: { x: 350, y: 440 },
  joelho_direito: { x: 620, y: 710 },
  joelho_esquerdo: { x: 380, y: 710 },
  calcaneo_direito: { x: 620, y: 950 },
  calcaneo_esquerdo: { x: 380, y: 950 },
  // Coluna reta, de C7 (170) até S1 (470).
  coluna: [170, 230, 290, 350, 410, 470].map((y) => ({ x: 500, y })),
};

/** Coluna com desvio lateral: `dx` em px (imagem 1000×1000) em cada altura. */
const colunaCom = (dx: Record<number, number>) =>
  [170, 230, 290, 350, 410, 470].map((y) => ({ x: 500 + (dx[y] ?? 0), y }));

const ANTERIOR: PontosAnterior = {
  vertice: { x: 500, y: 20 },
  acromio_direito: { x: 220, y: 200 },
  acromio_esquerdo: { x: 780, y: 200 },
  manubrio: { x: 500, y: 250 },
  eias_direita: { x: 320, y: 440 },
  eias_esquerda: { x: 680, y: 440 },
  patela_direita: { x: 360, y: 720 },
  patela_esquerda: { x: 640, y: 720 },
  tornozelo_direito: { x: 360, y: 920 },
  tornozelo_esquerdo: { x: 640, y: 920 },
  pe_direito: { x: 340, y: 955 },
  pe_esquerdo: { x: 660, y: 955 },
};

describe("normalizarPonto", () => {
  it("converte 0–1000 para 0..1 e limita ao quadro", () => {
    expect(normalizarPonto({ x: 250, y: 500 })).toEqual({ x: 0.25, y: 0.5 });
    expect(normalizarPonto({ x: -20, y: 1200 })).toEqual({ x: 0, y: 1 });
  });
});

describe("resultadoAnaliseSchema", () => {
  it("aceita vista com pontos parciais", () => {
    const r = resultadoAnaliseSchema.safeParse({
      vista: "posterior",
      confianca: 0.9,
      pontos: { c7: { x: 1, y: 2 } },
    });
    expect(r.success).toBe(true);
  });

  it("recusa vista desconhecida e ponto malformado", () => {
    expect(resultadoAnaliseSchema.safeParse({ vista: "obliqua", confianca: 1 }).success).toBe(false);
    expect(
      resultadoAnaliseSchema.safeParse({
        vista: "anterior",
        confianca: 1,
        pontos: { manubrio: { x: "a" } },
      }).success,
    ).toBe(false);
  });
});

describe("protocolo posterior nivelado", () => {
  const { formas, ausentes, achados } = respostaParaFormas(
    { vista: "posterior", confianca: 0.9, pontos: POSTERIOR },
    ctx,
  );

  it("desenha eixo vertical azul passando pelo meio dos calcâneos", () => {
    const eixo = porId(formas, "ia-eixo");
    expect(eixo?.tipo).toBe("linha");
    if (eixo?.tipo !== "linha") return;
    expect(eixo.cor).toBe(COR_PROTOCOLO.referencia);
    expect(eixo.a.x).toBeCloseTo(0.5);
    expect(eixo.b.x).toBeCloseTo(0.5);
    expect(eixo.a.y).toBeLessThan(0.02);
    expect(eixo.b.y).toBeGreaterThan(0.95);
  });

  it("linhas niveladas são azuis tracejadas, com rótulo à direita", () => {
    for (const [par, nome] of [
      ["acromios", "Linha acromial"],
      ["escapulas", "Linha escapular"],
      ["pelve", "Linha pélvica (EIPS)"],
      ["pes", "Alinhamento dos pés"],
    ]) {
      const l = porId(formas, `ia-${par}`);
      expect(l?.tipo === "linha" && l.tracejada, par).toBe(true);
      expect(l?.cor).toBe(COR_PROTOCOLO.referencia);
      const r = rotuloDe(formas, `ia-${par}-rot`);
      expect(r?.texto).toBe(nome);
      expect(r?.estilo).toBe("linha");
      expect(r!.pos.x).toBeGreaterThan(0.7); // coluna da direita
    }
    expect(porId(formas, "ia-acromios-alerta")).toBeUndefined();
  });

  it("joelhos posteriores são só pontos (sem linha)", () => {
    expect(porId(formas, "ia-joelhos")).toBeUndefined();
    expect(porId(formas, "ia-pt-joelho_direito")?.tipo).toBe("ponto");
  });

  it("todos os pontos anatômicos em verde e o marco C7", () => {
    const pontos = formas.filter((f) => f.tipo === "ponto");
    expect(pontos).toHaveLength(12); // pontos da coluna viram a curva, não bolinhas
    expect(pontos.every((p) => p.cor === COR_PROTOCOLO.ponto)).toBe(true);
    const c7 = rotuloDe(formas, "ia-marco-c7");
    expect(c7?.texto).toBe("C7");
    expect(c7?.alvo).toEqual({ x: 0.5, y: 0.17 });
  });

  it("rótulos das regiões à esquerda, na ordem do protocolo", () => {
    const regioes = formas
      .filter((f): f is Extract<Forma, { tipo: "rotulo" }> => f.tipo === "rotulo" && f.estilo === "regiao")
      .sort((a, b) => a.pos.y - b.pos.y)
      .map((f) => f.texto);
    expect(regioes).toEqual([
      "Cabeça/Cervical",
      "Ombros",
      "Escápulas",
      "Coluna/Tronco",
      "Pelve",
      "Joelhos",
      "Tornozelos/Pés",
    ]);
  });

  it("lista as linhas encontradas e nada ausente", () => {
    expect(ausentes).toEqual([]);
    expect(achados.map((a) => [a.nome, a.detalhe])).toEqual([
      ["Eixo do tronco", "alinhado"],
      ["Linha acromial", "nivelada"],
      ["Linha escapular", "nivelada"],
      ["Linha pélvica (EIPS)", "nivelada"],
      ["Alinhamento dos pés", "nivelada"],
      ["Linha da coluna", "sem desvio lateral relevante"],
    ]);
  });

  it("todas as formas têm id ia- e passam no schema de salvar", () => {
    expect(formas.every((f) => f.id.startsWith("ia-"))).toBe(true);
    expect(new Set(formas.map((f) => f.id)).size).toBe(formas.length);
    validarSalvavel(formas);
  });
});

describe("assimetria", () => {
  it("ombro esquerdo mais baixo na posterior → laranja, ângulo e lado do paciente", () => {
    // Posterior: esquerdo do paciente à esquerda da imagem. Desce 25px em 560px ≈ 2,6°.
    const { formas, achados } = respostaParaFormas(
      {
        vista: "posterior",
        confianca: 1,
        pontos: { ...POSTERIOR, acromio_esquerdo: { x: 220, y: 225 } },
      },
      ctx,
    );
    const linha = porId(formas, "ia-acromios");
    expect(linha?.cor).toBe(COR_PROTOCOLO.assimetria);
    expect(linha?.tipo === "linha" && linha.tracejada).toBe(true);
    const ref = porId(formas, "ia-acromios-ref");
    expect(ref?.tipo === "linha" && ref.a.y === ref.b.y).toBe(true); // horizontal
    expect(ref?.cor).toBe(COR_PROTOCOLO.referencia);
    const alerta = rotuloDe(formas, "ia-acromios-alerta");
    expect(alerta?.titulo).toBe("2,6°");
    expect(alerta?.texto).toBe("Inclinação para esquerda");
    expect(alerta?.estilo).toBe("alerta");
    expect(achados.find((a) => a.nome === "Linha acromial")).toEqual({
      nome: "Linha acromial",
      detalhe: "2,6°, inclinação para esquerda",
      alerta: true,
    });
    validarSalvavel(formas);
  });

  it("acentuada (≥5°) fica vermelha", () => {
    const { formas, achados } = respostaParaFormas(
      { vista: "anterior", confianca: 1, pontos: { ...ANTERIOR, eias_direita: { x: 320, y: 480 } } },
      ctx,
    );
    expect(porId(formas, "ia-pelve")?.cor).toBe(COR_PROTOCOLO.acentuada);
    // Anterior: direito do paciente à esquerda da imagem, e é ele que desceu.
    expect(rotuloDe(formas, "ia-pelve-alerta")?.texto).toBe("Inclinação para direita");
    expect(achados.find((a) => a.nome === "Linha pélvica (EIAS)")?.detalhe).toMatch(/acentuada/);
  });

  it("tronco deslocado do eixo vira achado com o lado do paciente", () => {
    const { achados } = respostaParaFormas(
      { vista: "posterior", confianca: 1, pontos: { ...POSTERIOR, c7: { x: 530, y: 170 } } },
      ctx,
    );
    // 30px para a direita da imagem = direita do paciente na posterior.
    expect(achados[0]).toEqual({ nome: "Eixo do tronco", detalhe: "C7 30 px para a direita", alerta: true });
  });

  it("deslocamento em cm com calibração", () => {
    const calibrado = { ...ctx, calibracao: { a: { x: 0, y: 0 }, b: { x: 0.1, y: 0 }, cm: 10 } };
    const { achados } = respostaParaFormas(
      { vista: "anterior", confianca: 1, pontos: { ...ANTERIOR, manubrio: { x: 480, y: 250 } } },
      calibrado,
    );
    // 20px = 2 cm; para a esquerda da imagem = direita do paciente na anterior.
    expect(achados[0].detalhe).toBe("manúbrio 2,0 cm para a direita");
  });
});

describe("linha da coluna (escoliose)", () => {
  const analisar = (coluna: { x: number; y: number }[], calibracao: typeof ctx.calibracao = null) =>
    respostaParaFormas(
      { vista: "posterior", confianca: 1, pontos: { ...POSTERIOR, coluna } },
      { ...ctx, calibracao },
    );
  const coluna = (achados: { nome: string; detalhe: string }[]) =>
    achados.find((a) => a.nome === "Linha da coluna")?.detalhe;

  it("coluna reta: curva azul, referência tracejada, sem alerta", () => {
    const { formas } = analisar(POSTERIOR.coluna!);
    expect(porId(formas, "ia-coluna")?.cor).toBe(COR_PROTOCOLO.referencia);
    const ref = porId(formas, "ia-coluna-ref");
    expect(ref?.tipo === "linha" && ref.tracejada).toBe(true);
    expect(porId(formas, "ia-coluna-alerta-0")).toBeUndefined();
    expect(rotuloDe(formas, "ia-coluna-rot")?.texto).toBe("Linha da coluna");
  });

  it("curva torácica para a direita do paciente (posterior: direita da imagem)", () => {
    // Escápulas em 300 e EIPS em 440 → T12 ≈ 359; ápice em 290 é torácico.
    const { formas, achados } = analisar(colunaCom({ 230: 12, 290: 20, 350: 10 }));
    expect(coluna(achados)).toBe("curva torácica, convexidade à direita (20 px)");
    expect(porId(formas, "ia-coluna")?.cor).toBe(COR_PROTOCOLO.assimetria);
    const alerta = rotuloDe(formas, "ia-coluna-alerta-0");
    expect(alerta?.titulo).toBe("20 px");
    expect(alerta?.texto).toBe("Convexidade à direita");
    expect(alerta?.alvo).toEqual({ x: 0.52, y: 0.29 });
    expect(alerta!.pos.x).toBeGreaterThan(0.52); // caixa do lado da convexidade
    validarSalvavel(formas);
  });

  it("curva em S: torácica e lombar para lados opostos", () => {
    const { achados } = analisar(colunaCom({ 230: 15, 290: 18, 350: 0, 410: -16 }));
    expect(coluna(achados)).toBe(
      "curva em S: torácica à direita (18 px), lombar à esquerda (16 px)",
    );
  });

  it("desvio só no fim da coluna (base deslocada) também conta", () => {
    const { achados } = analisar(colunaCom({ 410: -8, 470: -20 }));
    expect(coluna(achados)).toBe("curva lombar, convexidade à esquerda (20 px)");
  });

  it("desvio pequeno (< 1% da altura) é ignorado", () => {
    const { achados } = analisar(colunaCom({ 290: 6 }));
    expect(coluna(achados)).toBe("sem desvio lateral relevante");
  });

  it("acentuada fica vermelha", () => {
    const { formas, achados } = analisar(colunaCom({ 290: 40 }));
    expect(porId(formas, "ia-coluna")?.cor).toBe(COR_PROTOCOLO.acentuada);
    expect(coluna(achados)).toMatch(/acentuada$/);
  });

  it("em cm com calibração (≥ 1 cm)", () => {
    // 100px = 10cm → 15px = 1,5 cm
    const { achados } = analisar(colunaCom({ 290: 15 }), {
      a: { x: 0, y: 0 },
      b: { x: 0.1, y: 0 },
      cm: 10,
    });
    expect(coluna(achados)).toBe("curva torácica, convexidade à direita (1,5 cm)");
  });

  it("sem pontos da coluna, ela aparece em não encontrado", () => {
    const { ausentes, formas } = analisar([]);
    expect(ausentes).toContain("Linha da coluna");
    expect(porId(formas, "ia-coluna")).toBeUndefined();
  });

  it("apicesColuna mede o maior desvio de cada lado em relação ao prumo de C7", () => {
    const pts = [
      { x: 0.5, y: 0.1 },
      { x: 0.55, y: 0.3 },
      { x: 0.47, y: 0.5 },
      { x: 0.5, y: 0.7 },
    ];
    const ap = apicesColuna(pts, 1000);
    expect(ap.map((a) => [a.sentido, Math.round(a.px)])).toEqual([
      [1, 50],
      [-1, 30],
    ]);
  });

  it("suavizarCurva passa pelos pontos originais", () => {
    const pts = [
      { x: 0.5, y: 0.1 },
      { x: 0.55, y: 0.3 },
      { x: 0.5, y: 0.5 },
    ];
    const curva = suavizarCurva(pts, 4);
    expect(curva).toHaveLength(9);
    expect(curva[0]).toEqual(pts[0]);
    expect(curva[4].x).toBeCloseTo(0.55);
    expect(curva[8]).toEqual(pts[2]);
  });
});

describe("caixaColuna / pontoDoRecorte", () => {
  it("recorta de C7 à pelve com margens e limita ao quadro", () => {
    const c = caixaColuna({
      c7: { x: 500, y: 20 },
      eips_direita: { x: 950, y: 980 },
      eips_esquerda: { x: 400, y: 600 },
    })!;
    expect(c.x).toBeCloseTo(0.28);
    expect(c.y).toBe(0);
    expect(c.x + c.w).toBe(1);
    expect(c.y + c.h).toBe(1);
  });

  it("sem C7 ou sem base abaixo dele, não recorta", () => {
    expect(caixaColuna({ eips_direita: { x: 1, y: 900 } })).toBeNull();
    expect(caixaColuna({ c7: { x: 500, y: 300 } })).toBeNull();
  });

  it("converte ponto do recorte para a imagem inteira", () => {
    expect(pontoDoRecorte({ x: 500, y: 500 }, { x: 0.2, y: 0.1, w: 0.4, h: 0.6 })).toEqual({
      x: 400,
      y: 400,
    });
  });
});

describe("protocolo anterior", () => {
  const { formas, ausentes } = respostaParaFormas(
    { vista: "anterior", confianca: 0.9, pontos: ANTERIOR },
    ctx,
  );

  it("tem as linhas do esquema anterior e o marco do manúbrio", () => {
    expect(rotuloDe(formas, "ia-acromios-rot")?.texto).toBe("Linha acromial");
    expect(rotuloDe(formas, "ia-pelve-rot")?.texto).toBe("Linha pélvica (EIAS)");
    expect(rotuloDe(formas, "ia-pes-rot")?.texto).toBe("Alinhamento dos pés");
    // Linha dos joelhos (patelas) tracejada, sem rótulo de linha.
    expect(porId(formas, "ia-joelhos")?.tipo).toBe("linha");
    expect(porId(formas, "ia-joelhos-rot")).toBeUndefined();
    // Tornozelos só pontos.
    expect(porId(formas, "ia-tornozelos")).toBeUndefined();
    expect(rotuloDe(formas, "ia-marco-manubrio")?.texto).toBe("Manúbrio (esterno)");
    expect(ausentes).toEqual([]);
    validarSalvavel(formas);
  });

  it("eixo pelo meio dos pés", () => {
    const eixo = porId(formas, "ia-eixo");
    expect(eixo?.tipo === "linha" && eixo.a.x).toBeCloseTo(0.5);
  });
});

describe("ponto ausente", () => {
  it("omite a linha dependente e lista o que faltou", () => {
    const { formas, ausentes } = respostaParaFormas(
      {
        vista: "posterior",
        confianca: 0.8,
        pontos: { ...POSTERIOR, escapula_esquerda: undefined, calcaneo_direito: undefined },
      },
      ctx,
    );
    expect(porId(formas, "ia-escapulas")).toBeUndefined();
    expect(porId(formas, "ia-pt-escapula_direita")).toBeDefined(); // o ponto achado continua
    expect(ausentes).toEqual(["Linha escapular", "Alinhamento dos pés"]);
    // Sem os dois calcâneos o eixo cai no vértice.
    const eixo = porId(formas, "ia-eixo");
    expect(eixo?.tipo === "linha" && eixo.a.x).toBeCloseTo(0.5);
  });

  it("sem pontos não desenha nada", () => {
    const r = respostaParaFormas({ vista: "anterior", confianca: 0.5, pontos: {} }, ctx);
    expect(r.formas).toEqual([]);
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

  it("desenha prumo a partir do maléolo, alinhamento, pontos e medida da cabeça", () => {
    const { formas, ausentes, achados } = respostaParaFormas(
      { vista: "lateral_direita", confianca: 0.9, pontos },
      ctx,
    );
    const prumo = porId(formas, "ia-prumo");
    expect(prumo?.tipo === "linha" && prumo.a).toEqual({ x: 0.5, y: 0.95 });
    expect(prumo?.tipo === "linha" && prumo.b.x).toBe(0.5);
    expect(porId(formas, "ia-cabeca")?.tipo).toBe("medida");
    expect(formas.filter((f) => f.tipo === "ponto")).toHaveLength(5);
    // Lateral direita: paciente olha para a direita da imagem; trago 60px à direita do prumo.
    expect(achados.find((a) => a.nome === "Cabeça")?.detalhe).toBe("60 px à frente do prumo");
    expect(ausentes).toEqual([]);
    validarSalvavel(formas);
  });

  it("na lateral esquerda o mesmo deslocamento é para trás", () => {
    const { achados } = respostaParaFormas({ vista: "lateral_esquerda", confianca: 0.9, pontos }, ctx);
    expect(achados.find((a) => a.nome === "Cabeça")?.detalhe).toBe("60 px atrás do prumo");
  });
});

describe("não postural", () => {
  it("não gera formas", () => {
    expect(respostaParaFormas({ vista: "nao_postural", confianca: 0.99 }, ctx)).toEqual({
      formas: [],
      ausentes: [],
      achados: [],
    });
  });
});

describe("substituirFormasIa", () => {
  it("troca só as formas ia- e mantém as feitas à mão", () => {
    const manual: Forma = { id: "f1", cor: "#ef4444", tipo: "linha", a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
    const velha: Forma = { ...manual, id: "ia-acromios" };
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

  it("ladoPaciente inverte entre anterior e posterior", () => {
    expect(ladoPaciente(10, "posterior")).toBe("direita");
    expect(ladoPaciente(10, "anterior")).toBe("esquerda");
  });

  it("quebrarLinhas respeita o limite por palavra", () => {
    expect(quebrarLinhas("Inclinação para esquerda", 16)).toEqual(["Inclinação para", "esquerda"]);
    expect(quebrarLinhas("C7", 16)).toEqual(["C7"]);
  });
});
