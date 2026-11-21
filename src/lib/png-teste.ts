import { crc32, deflateSync } from "node:zlib";

/**
 * Só para testes (unitários e E2E): PNG RGBA válido com um traço preto horizontal no
 * meio, em fundo transparente ou branco opaco (como a foto de uma assinatura no papel).
 * Gera sem dependência de biblioteca de imagem.
 */
export function pngDeTeste(largura: number, altura: number, fundoBranco = false): Buffer {
  const linha = 1 + largura * 4;
  const cru = Buffer.alloc(linha * altura);
  const meio = Math.floor(altura / 2);
  for (let y = 0; y < altura; y++) {
    cru[y * linha] = 0; // filtro "None"
    if (fundoBranco) cru.fill(255, y * linha + 1, (y + 1) * linha);
    if (Math.abs(y - meio) > 1) continue;
    for (let x = Math.floor(largura * 0.1); x < Math.ceil(largura * 0.9); x++) {
      const i = y * linha + 1 + x * 4;
      cru[i] = cru[i + 1] = cru[i + 2] = 0;
      cru[i + 3] = 255; // preto opaco
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(cru)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

function bloco(tipo: string, dados: Buffer) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}
