/**
 * Lógica pura do armazenamento de arquivos de paciente (Cloudflare R2).
 * Isolamento por paciente: todo objeto fica sob `pacientes/{pacienteId}/`.
 * Aceita qualquer tipo de arquivo, exceto executáveis/scripts (lista abaixo).
 */

/** Extensões recusadas: executáveis, scripts, instaladores e páginas ativas. */
export const EXTENSOES_BLOQUEADAS = new Set([
  "exe", "msi", "com", "scr", "dll", "sys", "cpl", "msc", "pif", "gadget",
  "bat", "cmd", "ps1", "psm1", "vbs", "vbe", "wsf", "wsh", "hta", "reg", "lnk",
  "sh", "bash", "zsh", "csh", "ksh", "run", "bin", "elf", "out", "command",
  "js", "jse", "mjs", "cjs", "jar", "class", "py", "pyc", "pl", "rb", "php",
  "app", "apk", "ipa", "dmg", "pkg", "deb", "rpm", "appimage", "xpi", "crx",
  "html", "htm", "xhtml", "svg",
]);

export const TAMANHO_MAXIMO_ARQUIVO = 15 * 1024 * 1024;
export const MAX_ARQUIVOS_POR_COLUNA = 10;

/** Extensão (minúscula, sem ponto) do nome; ignora espaços/pontos no fim, como o Windows. */
export function extensaoDoNome(nome: string) {
  const limpo = nome.trim().replace(/[. ]+$/, "");
  const i = limpo.lastIndexOf(".");
  return i < 0 ? "" : limpo.slice(i + 1).toLowerCase();
}

/** Extensão segura para compor a chave no R2 ("bin" se ausente/estranha). */
export function extensaoSegura(nome: string) {
  const ext = extensaoDoNome(nome);
  return /^[a-z0-9]{1,10}$/.test(ext) ? ext : "bin";
}

/** Só imagens raster viram miniatura/inline; o resto é baixado. */
export function ehImagem(mime: string) {
  return /^image\/(jpeg|png|webp|gif|heic|avif|bmp)$/.test(mime);
}

/**
 * Como pré-visualizar no navegador (null = só baixar). Só tipos que o
 * navegador renderiza sem executar código do arquivo.
 */
export function tipoPreview(mime: string): "imagem" | "pdf" | "video" | "audio" | null {
  if (ehImagem(mime)) return "imagem";
  if (mime === "application/pdf") return "pdf";
  if (/^video\/(mp4|webm|quicktime|ogg)$/.test(mime)) return "video";
  if (/^audio\/(mpeg|mp4|wav|x-wav|webm|ogg|aac)$/.test(mime)) return "audio";
  return null;
}

/** Mime declarado pelo navegador, ou genérico se vazio/malformado. */
export function mimeEfetivo(mime: string) {
  return /^[\w.+-]+\/[\w.+-]+$/.test(mime) ? mime : "application/octet-stream";
}

export function prefixoPaciente(pacienteId: string) {
  return `pacientes/${pacienteId}/`;
}

/**
 * Área temporária: o upload acontece assim que a pessoa escolhe o arquivo,
 * antes de o exame ser salvo. Fica fora de `pacientes/` para uma regra de
 * expiração do bucket (prefixo `tmp/`) limpar o que for abandonado.
 */
export const PREFIXO_TMP = "tmp/";

export function prefixoTmpPaciente(pacienteId: string) {
  return `${PREFIXO_TMP}pacientes/${pacienteId}/`;
}

export function montarChaveTmp(params: {
  pacienteId: string;
  uuid: string;
  nome: string;
}) {
  return `${prefixoTmpPaciente(params.pacienteId)}${params.uuid}.${extensaoSegura(params.nome)}`;
}

export function chaveTmpDoPaciente(chave: string, pacienteId: string) {
  return chave.startsWith(prefixoTmpPaciente(pacienteId)) && !chave.includes("..");
}

/** Pré-cadastro público: máx. de arquivos por envio (formulário sem login). */
export const MAX_ARQUIVOS_PRE_CADASTRO = 5;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de sessão de upload gerado pelo navegador (uuid); define a pasta tmp. */
export function sessaoUploadValida(sessaoId: string) {
  return UUID.test(sessaoId);
}

export function prefixoTmpPreCadastro(sessaoId: string) {
  return `${PREFIXO_TMP}pre-cadastro/${sessaoId}/`;
}

export function montarChaveTmpPreCadastro(params: {
  sessaoId: string;
  uuid: string;
  nome: string;
}) {
  return `${prefixoTmpPreCadastro(params.sessaoId)}${params.uuid}.${extensaoSegura(params.nome)}`;
}

export function chaveTmpPreCadastroValida(chave: string, sessaoId: string) {
  return (
    sessaoUploadValida(sessaoId) &&
    chave.startsWith(prefixoTmpPreCadastro(sessaoId)) &&
    !chave.includes("..")
  );
}

export function prefixoPreCadastro(preCadastroId: string) {
  return `pre-cadastro/${preCadastroId}/`;
}

export function montarChaveArquivoPreCadastro(params: {
  preCadastroId: string;
  uuid: string;
  nome: string;
}) {
  return `${prefixoPreCadastro(params.preCadastroId)}${params.uuid}.${extensaoSegura(params.nome)}`;
}

/** Anexos do histórico clínico: máx. por paciente. */
export const MAX_ANEXOS_PACIENTE = 50;

export function montarChaveAnexoPaciente(params: {
  pacienteId: string;
  uuid: string;
  nome: string;
}) {
  return `${prefixoPaciente(params.pacienteId)}anexos/${params.uuid}.${extensaoSegura(params.nome)}`;
}

export function prefixoExecucao(pacienteId: string, execucaoId: string) {
  return `${prefixoPaciente(pacienteId)}execucoes/${execucaoId}/`;
}

export function montarChaveImagem(params: {
  pacienteId: string;
  execucaoId: string;
  colunaId: string;
  linha: number;
  uuid: string;
  nome: string;
}) {
  return `${prefixoExecucao(params.pacienteId, params.execucaoId)}${params.colunaId}/${params.linha}/${params.uuid}.${extensaoSegura(params.nome)}`;
}

/** Retorna mensagem de erro ou null se o arquivo é aceito. */
export function validarArquivo(nome: string, tamanho: number): string | null {
  if (!nome.trim()) return "Arquivo sem nome.";
  const ext = extensaoDoNome(nome);
  if (EXTENSOES_BLOQUEADAS.has(ext)) {
    return `Arquivos .${ext} não são permitidos (executáveis e scripts).`;
  }
  if (!Number.isFinite(tamanho) || tamanho <= 0) return "Arquivo vazio.";
  if (tamanho > TAMANHO_MAXIMO_ARQUIVO) return "Arquivo maior que 15 MB.";
  return null;
}

/** A chave pertence ao prefixo do paciente (defesa contra chaves forjadas). */
export function chaveDoPaciente(chave: string, pacienteId: string) {
  return chave.startsWith(prefixoPaciente(pacienteId)) && !chave.includes("..");
}

export type RemapLinha = { colunaId: string; de: number; para: number };

/**
 * Ao editar, linhas repetíveis são reindexadas pela posição. Converte os ids de
 * linha do form (`linha-N` = índice salvo; outros = nova) no mapa de/para,
 * em ordem ascendente de `de` (preserva ordem, então não há colisão).
 */
export function montarRemapLinhas(
  linhasPorColuna: Record<string, string[]>,
): RemapLinha[] {
  const remap: RemapLinha[] = [];
  for (const [colunaId, linhaIds] of Object.entries(linhasPorColuna)) {
    linhaIds.forEach((linhaId, para) => {
      const m = /^linha-(\d+)$/.exec(linhaId);
      if (m) remap.push({ colunaId, de: Number(m[1]), para });
      else if (linhaId === "0") remap.push({ colunaId, de: 0, para });
    });
  }
  return remap.sort((a, b) => a.de - b.de);
}
