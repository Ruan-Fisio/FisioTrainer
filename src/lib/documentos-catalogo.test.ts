import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { camposDoTipo, TIPOS_DOCUMENTO, tipoDocumento } from "@/lib/documentos-catalogo";

const PASTA = path.join(process.cwd(), "src", "assets", "documentos");

describe("catálogo de documentos × modelos PDF", () => {
  it("slugs únicos e nomes de campo únicos por tipo", () => {
    const slugs = TIPOS_DOCUMENTO.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const tipo of TIPOS_DOCUMENTO) {
      const nomes = camposDoTipo(tipo).map((c) => c.nome);
      expect(new Set(nomes).size, tipo.slug).toBe(nomes.length);
      if (tipo.resumo) expect(nomes, tipo.slug).toContain(tipo.resumo);
    }
    expect(tipoDocumento("atestado-fisioterapeutico")?.titulo).toBe("Atestado fisioterapêutico");
    expect(tipoDocumento("nao-existe")).toBeUndefined();
  });

  const arquivos = [...new Set(TIPOS_DOCUMENTO.map((t) => t.arquivo))];

  it.each(arquivos)("%s: campos do catálogo batem com o AcroForm", async (arquivo) => {
    const pdf = await PDFDocument.load(readFileSync(path.join(PASTA, arquivo)));
    const paginas = pdf.getPages();
    const doPdf = new Map(pdf.getForm().getFields().map((f) => [f.getName(), f]));
    const tipos = TIPOS_DOCUMENTO.filter((t) => t.arquivo === arquivo);

    // Todo campo do PDF é coberto por exatamente um tipo que usa o arquivo.
    const doCatalogo = tipos.flatMap((t) => camposDoTipo(t).map((c) => ({ tipo: t, campo: c })));
    expect(doCatalogo.map((x) => x.campo.nome).sort()).toEqual([...doPdf.keys()].sort());

    for (const { tipo, campo } of doCatalogo) {
      const f = doPdf.get(campo.nome)!;
      if (campo.tipo === "checkbox") {
        expect(f, campo.nome).toBeInstanceOf(PDFCheckBox);
      } else {
        expect(f, campo.nome).toBeInstanceOf(PDFTextField);
        const tf = f as PDFTextField;
        expect(campo.max, campo.nome).toBe(tf.getMaxLength());
        expect(campo.tipo === "textarea", campo.nome).toBe(tf.isMultiline());
      }
      // O campo está numa página que o tipo mantém.
      const widget = f.acroField.getWidgets()[0];
      const pagina = paginas.findIndex((p) => p.ref === widget.P());
      expect(tipo.paginas, `${campo.nome} na página ${pagina}`).toContain(pagina);
    }
  });

  it("só encaminhamento e solicitação de exames ficam sem caixa de assinatura (modelo já assinado)", () => {
    const semCaixa = TIPOS_DOCUMENTO.filter((t) => t.assinaturas.length === 0).map((t) => t.slug);
    expect(semCaixa.sort()).toEqual(["encaminhamento-multiprofissional", "solicitacao-exames"]);
  });

  it.each(TIPOS_DOCUMENTO.filter((t) => t.assinaturas.length > 0).map((t) => [t.slug, t] as const))(
    "%s: caixa de assinatura numa página mantida, dentro da página e sem cobrir campos",
    async (_slug, tipo) => {
      const pdf = await PDFDocument.load(readFileSync(path.join(PASTA, tipo.arquivo)));
      const paginas = pdf.getPages();
      const widgets = pdf
        .getForm()
        .getFields()
        .flatMap((f) => f.acroField.getWidgets().map((w) => ({ nome: f.getName(), w })));
      for (const c of tipo.assinaturas) {
        expect(tipo.paginas).toContain(c.pagina);
        const { width, height } = paginas[c.pagina].getSize();
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.x + c.largura).toBeLessThanOrEqual(width);
        expect(c.y + c.altura).toBeLessThanOrEqual(height);
        expect(c.altura).toBeGreaterThanOrEqual(24);
        for (const { nome, w } of widgets) {
          if (w.P() !== paginas[c.pagina].ref) continue;
          const r = w.getRectangle();
          const sobrepoe =
            c.x < r.x + r.width && r.x < c.x + c.largura && c.y < r.y + r.height && r.y < c.y + c.altura;
          expect(sobrepoe, `caixa cobre o campo ${nome}`).toBe(false);
        }
      }
    },
  );
});
