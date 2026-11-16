import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { TIPOS_DOCUMENTO, tipoDocumento } from "@/lib/documentos-catalogo";
import { preencherDocumento, tamanhoQueCabe } from "@/lib/documentos-pdf";

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
