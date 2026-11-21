import { randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";

/** PNG cinza sólido (largura × altura) gerado na hora, sem arquivo de fixture. */
export function pngCinza(largura: number, altura: number): Buffer {
  const crcTabela = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTabela[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer) => {
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(corpo));
    return Buffer.concat([tam, corpo, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 0; // tons de cinza
  const linha = Buffer.alloc(largura + 1, 0x80);
  linha[0] = 0; // filtro
  const bruto = Buffer.concat(Array.from({ length: altura }, () => linha));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(bruto)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Anexa uma foto a uma avaliação do paciente direto no banco de teste (o upload
 * pela UI exige montar um exame com coluna de anexo). Os bytes vão para
 * `ArquivoDev` — o servidor E2E roda com o storage de dev (`STORAGE_DEV=db`).
 */
export async function anexarImagemDeTeste(pacienteId: string): Promise<{ imagemId: string }> {
  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    const exameId = randomUUID();
    const execucaoId = randomUUID();
    const imagemId = randomUUID();
    const chave = `pacientes/${pacienteId}/${randomUUID()}.png`;
    const png = pngCinza(300, 400);
    await db.query(
      `INSERT INTO "Exame" (id, nome, "updatedAt") VALUES ($1, $2, now())`,
      [exameId, `Postura E2E ${exameId.slice(0, 6)}`],
    );
    await db.query(
      `INSERT INTO "ExameExecucao" (id, tipo, "exameId", "pacienteId") VALUES ($1, 'AVALIACAO', $2, $3)`,
      [execucaoId, exameId, pacienteId],
    );
    await db.query(
      `INSERT INTO "ArquivoDev" (chave, mime, tamanho, conteudo, "atualizadoEm") VALUES ($1, 'image/png', $2, $3, now())`,
      [chave, png.length, png.toString("base64")],
    );
    await db.query(
      `INSERT INTO "ExameExecucaoImagem" (id, "execucaoId", "colunaId", chave, "nomeOriginal", mime, tamanho)
       VALUES ($1, $2, 'coluna-e2e', $3, 'postura.png', 'image/png', $4)`,
      [imagemId, execucaoId, chave, png.length],
    );
    return { imagemId };
  } finally {
    await db.end();
  }
}

/** Ids das formas salvas na imagem (para conferir o que foi persistido). */
export async function idsDasFormasSalvas(imagemId: string): Promise<string[]> {
  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    const r = await db.query(`SELECT anotacoes FROM "ExameExecucaoImagem" WHERE id = $1`, [imagemId]);
    const anot = r.rows[0]?.anotacoes as { formas?: { id: string }[] } | null;
    return anot?.formas?.map((f) => f.id) ?? [];
  } finally {
    await db.end();
  }
}
