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
});
