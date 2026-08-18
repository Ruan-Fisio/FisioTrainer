// Colunas MULTIPLA_ESCOLHA guardam a(s) opcao(oes) selecionada(s) como uma
// unica string no banco. O texto das opcoes e livre (ex: "Positivo =
// Reproducao da dor, irradiacao ou fraqueza") e pode conter virgulas, entao
// NUNCA usar "," como separador ao juntar/quebrar selecoes multiplas — um
// texto de opcao com virgula corrompe o parse e a opcao nunca aparece como
// marcada (bug real: teste especial "Positivo" nao marcava). Usamos um
// caractere de controle (Unit Separator) que não aparece em texto digitado.
export const MULTIPLA_ESCOLHA_DELIMITER = "␟";

// O delimitador vem sempre no início (mesmo com 1 única opção selecionada),
// para distinguir sem ambiguidade o formato novo de dados legados gravados
// com "," — se só olhássemos "contém o delimitador?", uma única opção
// selecionada (sem nenhum delimitador entre itens) cairia no fallback
// legado e voltaria a quebrar quando o texto da opção tivesse vírgula.
export function serializeSelecionadas(selecionadas: string[]): string {
  if (selecionadas.length === 0) return "";
  return (
    MULTIPLA_ESCOLHA_DELIMITER + selecionadas.join(MULTIPLA_ESCOLHA_DELIMITER)
  );
}

// Aceita dados legados gravados com "," antes desta correção.
export function parseSelecionadas(valor: string): string[] {
  if (!valor) return [];
  if (valor.startsWith(MULTIPLA_ESCOLHA_DELIMITER)) {
    return valor.slice(MULTIPLA_ESCOLHA_DELIMITER.length).split(
      MULTIPLA_ESCOLHA_DELIMITER,
    );
  }
  return valor.split(",");
}

export function toggleSelecionada(valor: string, opcao: string): string {
  const selecionadas = parseSelecionadas(valor);
  const jaSelecionada = selecionadas.includes(opcao);
  const novaSelecao = jaSelecionada
    ? selecionadas.filter((item) => item !== opcao)
    : [...selecionadas, opcao];
  return serializeSelecionadas(novaSelecao);
}
