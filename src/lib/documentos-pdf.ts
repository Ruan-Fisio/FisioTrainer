import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import {
  camposDoTipo,
  type TipoDocumento,
  type ValoresDocumento,
} from "@/lib/documentos-catalogo";
import { paraWinAnsi, valorParaPdf } from "@/lib/documentos-valores";

/** Pasta dos modelos (também listada em `outputFileTracingIncludes` no next.config). */
export const PASTA_MODELOS = path.join(process.cwd(), "src", "assets", "documentos");

const cacheModelos = new Map<string, Promise<Buffer>>();

export function lerModelo(arquivo: string): Promise<Buffer> {
  let p = cacheModelos.get(arquivo);
  if (!p) {
    p = readFile(path.join(PASTA_MODELOS, arquivo));
    p.catch(() => cacheModelos.delete(arquivo));
    cacheModelos.set(arquivo, p);
  }
  return p;
}

const TAMANHO_FONTE = 10;
const TAMANHO_MINIMO = 6;
const ENTRELINHA = 1.2;

/** Maior tamanho (≤ 10pt) em que o texto, quebrado por palavra, cabe na caixa. */
export function tamanhoQueCabe(texto: string, largura: number, altura: number, fonte: PDFFont): number {
  for (let tam = TAMANHO_FONTE; tam > TAMANHO_MINIMO; tam -= 0.5) {
    if (contarLinhas(texto, largura, tam, fonte) * tam * ENTRELINHA <= altura) return tam;
  }
  return TAMANHO_MINIMO;
}

function contarLinhas(texto: string, largura: number, tam: number, fonte: PDFFont): number {
  let linhas = 0;
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    linhas++;
    for (const palavra of paragrafo.split(" ")) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (atual && fonte.widthOfTextAtSize(tentativa, tam) > largura) {
        linhas++;
        atual = palavra;
      } else {
        atual = tentativa;
      }
    }
  }
  return linhas;
}

/**
 * Preenche o modelo AcroForm do tipo com os valores e devolve o PDF final: formulário
 * "achatado" (o paciente recebe o documento pronto, não editável) e só com as páginas do
 * documento — páginas de apoio ao profissional e as do outro documento do mesmo arquivo
 * (relatório × parecer) ficam de fora.
 */
export async function preencherDocumento(
  tipo: TipoDocumento,
  valores: ValoresDocumento,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(await lerModelo(tipo.arquivo));
  const form = pdf.getForm();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  for (const campo of camposDoTipo(tipo)) {
    const valor = valores[campo.nome];
    if (campo.tipo === "checkbox") {
      const cb = form.getCheckBox(campo.nome);
      if (valor === true) cb.check();
      else cb.uncheck();
      continue;
    }
    const texto = typeof valor === "string" ? paraWinAnsi(valorParaPdf(campo, valor)) : "";
    const tf = form.getTextField(campo.nome);
    const max = tf.getMaxLength();
    const final = max !== undefined && texto.length > max ? texto.slice(0, max) : texto;
    tf.setText(final);
    const widget = tf.acroField.getWidgets()[0];
    const { width, height } = widget.getRectangle();
    const tamanho = tf.isMultiline()
      ? tamanhoQueCabe(final, width - 8, height - 6, helvetica)
      : TAMANHO_FONTE;
    // Os modelos (ReportLab) não trazem tamanho de fonte no DA — define aqui.
    tf.acroField.setDefaultAppearance(`/Helv ${tamanho} Tf 0 g`);
  }

  form.updateFieldAppearances(helvetica);
  form.flatten();

  const manter = new Set(tipo.paginas);
  for (let i = pdf.getPageCount() - 1; i >= 0; i--) {
    if (!manter.has(i)) pdf.removePage(i);
  }

  pdf.setTitle(tipo.titulo);
  pdf.setProducer("FisioTrainer");
  return pdf.save();
}
