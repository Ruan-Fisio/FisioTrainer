import { describe, expect, it } from "vitest";
import { PDFDict, PDFDocument, PDFName, PDFStream, StandardFonts, type PDFPage } from "pdf-lib";
import { TIPOS_DOCUMENTO, tipoDocumento } from "@/lib/documentos-catalogo";
import { encaixarImagem, preencherDocumento, tamanhoQueCabe } from "@/lib/documentos-pdf";
import { pngDeTeste } from "@/lib/png-teste";

describe("tamanhoQueCabe", () => {
  it("usa 10pt quando cabe e reduz quando o texto é longo, até 6pt", async () => {
    const pdf = await PDFDocument.create();
    const f = await pdf.embedFont(StandardFonts.Helvetica);
    expect(tamanhoQueCabe("curto", 500, 60, f)).toBe(10);
    const longo = "palavra ".repeat(60);
    const tam = tamanhoQueCabe(longo, 500, 40, f);
    expect(tam).toBeLessThan(10);
    expect(tam).toBeGreaterThanOrEqual(6);
    expect(tamanhoQueCabe("a\n".repeat(50), 500, 20, f)).toBe(6);
  });
});

describe("preencherDocumento", () => {
  it("gera PDF achatado só com as páginas do documento", async () => {
    const atestado = tipoDocumento("atestado-fisioterapeutico")!;
    const bytes = await preencherDocumento(atestado, {
      paciente_nome: "João da Conceição Ávila",
      paciente_nascimento: "1990-03-05",
      conclusao_funcional: "Linha 1\nLinha 2 — com travessão e “aspas” 💪",
      indicacao_afastamento: true,
      unidade_dias: true,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1); // a página de apoio sai
    expect(pdf.getForm().getFields()).toHaveLength(0); // achatado
    expect(pdf.getTitle()).toBe("Atestado fisioterapêutico");
  });

  it("relatório e parecer usam páginas diferentes do mesmo arquivo", async () => {
    for (const slug of ["relatorio-tecnico", "parecer-tecnico"]) {
      const pdf = await PDFDocument.load(await preencherDocumento(tipoDocumento(slug)!, {}));
      expect(pdf.getPageCount(), slug).toBe(1);
    }
    const tcle = await PDFDocument.load(await preencherDocumento(tipoDocumento("tcle")!, {}));
    expect(tcle.getPageCount()).toBe(2);
  });

  it.each(TIPOS_DOCUMENTO.map((t) => t.slug))("%s gera com todos os campos preenchidos no limite", async (slug) => {
    const tipo = tipoDocumento(slug)!;
    const valores: Record<string, string | boolean> = {};
    for (const s of tipo.secoes) {
      for (const c of s.campos) {
        if (c.tipo === "checkbox") valores[c.nome] = true;
        else if (c.tipo === "data") valores[c.nome] = "2026-11-16";
        else if (c.tipo === "hora") valores[c.nome] = "08:30";
        else valores[c.nome] = "ç".repeat(c.max ?? 10);
      }
    }
    const pdf = await PDFDocument.load(await preencherDocumento(tipo, valores));
    expect(pdf.getPageCount()).toBe(tipo.paginas.length);
  });
});

/** Imagens (XObject /Image) desenhadas direto na página. */
function imagensDaPagina(pagina: PDFPage) {
  const xobjs = pagina.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjs) return 0;
  return xobjs.keys().filter((k) => {
    const obj = xobjs.lookup(k);
    return obj instanceof PDFStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image");
  }).length;
}

async function contarImagens(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map(imagensDaPagina);
}

describe("encaixarImagem", () => {
  const caixa = { x: 100, y: 50, largura: 220, altura: 40 };

  it("limita pela altura, mantém a proporção e centraliza na horizontal", () => {
    expect(encaixarImagem({ largura: 900, altura: 300 }, caixa)).toEqual({
      x: 100 + (220 - 120) / 2,
      y: 50,
      largura: 120,
      altura: 40,
    });
  });

  it("limita pela largura quando a assinatura é comprida, apoiada na base", () => {
    const r = encaixarImagem({ largura: 900, altura: 100 }, caixa);
    expect(r.largura).toBe(220);
    expect(r.altura).toBeCloseTo(220 / 9);
    expect(r.x).toBe(100);
    expect(r.y).toBe(50);
  });
});

describe("preencherDocumento com assinatura", () => {
  const png = new Uint8Array(pngDeTeste(900, 300));

  it.each(TIPOS_DOCUMENTO.filter((t) => t.assinaturas.length > 0).map((t) => t.slug))(
    "%s: a assinatura entra só na página da caixa",
    async (slug) => {
      const tipo = tipoDocumento(slug)!;
      const sem = await contarImagens(await preencherDocumento(tipo, {}));
      const com = await contarImagens(await preencherDocumento(tipo, {}, png));
      // índice da página da caixa no PDF final (as páginas fora do tipo saem)
      const esperado = sem.map((n, i) =>
        n + tipo.assinaturas.filter((c) => tipo.paginas.indexOf(c.pagina) === i).length,
      );
      expect(com).toEqual(esperado);
    },
  );

  it("sem PNG o PDF não ganha imagem", async () => {
    const tipo = tipoDocumento("atestado-fisioterapeutico")!;
    const a = await contarImagens(await preencherDocumento(tipo, {}));
    const b = await contarImagens(await preencherDocumento(tipo, {}, null));
    expect(b).toEqual(a);
  });

  it.each(["encaminhamento-multiprofissional", "solicitacao-exames"])(
    "%s nunca recebe a assinatura cadastrada (modelo já assinado)",
    async (slug) => {
      const tipo = tipoDocumento(slug)!;
      const sem = await contarImagens(await preencherDocumento(tipo, {}));
      const com = await contarImagens(await preencherDocumento(tipo, {}, png));
      expect(com).toEqual(sem);
    },
  );
});
