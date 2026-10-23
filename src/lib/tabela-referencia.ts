// Tabela de referência do exame: uma tabela nomeada, genérica, que devolve
// valores conforme faixas de busca (ex: sexo e idade → limites de uma escala).
// Cada linha tem uma faixa (mín/máx, extremos inclusivos, vazio = aberto) por
// chave de busca e um valor numérico por saída. A primeira linha em que TODAS
// as faixas batem vence. Cada saída vira a variável `{Tabela.Saída}`, usável em
// qualquer fórmula/condição como as variáveis do exame (`compilarTabelas` gera
// variáveis com `SE` aninhado, então o motor de `exame-formula.ts` não muda).
// Persistido em `Exame.tabelas` (`Json`); números ficam como texto para
// permitir digitar `-`/`1,5` no formulário.

import { normalizarTitulo, type VariavelExame } from "@/lib/exame-formula";
import { parsePontosTexto } from "@/lib/pontuacao-opcao";

export type FaixaTabela = { min: string; max: string };

export type LinhaTabela = {
  /** Uma faixa por chave, alinhada por índice com `chaves`. */
  faixas: FaixaTabela[];
  /** Um valor por saída, alinhado por índice com `saidas`. */
  valores: string[];
};

export type TabelaReferencia = {
  nome: string;
  /** Variáveis de busca: `Idade`, `Sexo` ou o título de uma coluna numérica/calculada. */
  chaves: string[];
  saidas: string[];
  linhas: LinhaTabela[];
};

export type ErroTabela = { mensagem: string; tabelaIndex: number };

/** Nome da variável gerada para uma saída da tabela: `Tabela.Saída`. */
export function nomeVariavelTabela(tabela: string, saida: string): string {
  return `${tabela.trim()}.${saida.trim()}`;
}

function textoOuVazio(valor: unknown): string {
  return typeof valor === "string" ? valor : typeof valor === "number" ? String(valor) : "";
}

/** `Exame.tabelas` vem do Prisma como `Json` — normaliza, ignorando formato inesperado. */
export function parseTabelas(valor: unknown): TabelaReferencia[] {
  if (!Array.isArray(valor)) return [];
  const tabelas: TabelaReferencia[] = [];
  for (const item of valor) {
    if (typeof item !== "object" || item === null) continue;
    const bruto = item as Record<string, unknown>;
    if (typeof bruto.nome !== "string") continue;
    const chaves = Array.isArray(bruto.chaves) ? bruto.chaves.map(textoOuVazio) : [];
    const saidas = Array.isArray(bruto.saidas) ? bruto.saidas.map(textoOuVazio) : [];
    const linhas = (Array.isArray(bruto.linhas) ? bruto.linhas : []).map((linha) => {
      const l = (linha ?? {}) as Record<string, unknown>;
      const faixasBrutas = Array.isArray(l.faixas) ? l.faixas : [];
      const valoresBrutos = Array.isArray(l.valores) ? l.valores : [];
      return {
        faixas: chaves.map((_, i) => {
          const f = (faixasBrutas[i] ?? {}) as Record<string, unknown>;
          return { min: textoOuVazio(f.min), max: textoOuVazio(f.max) };
        }),
        valores: saidas.map((_, i) => textoOuVazio(valoresBrutos[i])),
      };
    });
    tabelas.push({ nome: bruto.nome, chaves, saidas, linhas });
  }
  return tabelas;
}

function numero(texto: string): number | null {
  return texto.trim() === "" ? null : parsePontosTexto(texto);
}

/** Condição (sintaxe de `exame-formula`) de uma linha: todas as faixas com limite, unidas por `&&`. */
function condicaoDaLinha(chaves: string[], faixas: FaixaTabela[]): string {
  const clausulas: string[] = [];
  chaves.forEach((chave, i) => {
    const min = numero(faixas[i]?.min ?? "");
    const max = numero(faixas[i]?.max ?? "");
    const ref = `{${chave.trim()}}`;
    if (min !== null && max !== null) {
      clausulas.push(min === max ? `${ref} == ${min}` : `${ref} entre ${min} e ${max}`);
    } else if (min !== null) {
      clausulas.push(`${ref} >= ${min}`);
    } else if (max !== null) {
      clausulas.push(`${ref} <= ${max}`);
    }
  });
  return clausulas.length > 0 ? clausulas.join(" && ") : "1 == 1";
}

/**
 * Uma variável por saída: `SE(linha 1; valor; SE(linha 2; valor; … 1/0))`. O
 * fim `1/0` é "paciente fora de todas as faixas" — vira o erro "divisão por
 * zero" no campo que usa a saída, em vez de um valor inventado.
 */
export function compilarTabelas(tabelas: TabelaReferencia[]): VariavelExame[] {
  const variaveis: VariavelExame[] = [];
  for (const tabela of tabelas) {
    tabela.saidas.forEach((saida, s) => {
      let formula = "1/0";
      for (let l = tabela.linhas.length - 1; l >= 0; l--) {
        const linha = tabela.linhas[l];
        const valor = numero(linha.valores[s] ?? "") ?? 0;
        formula = `SE(${condicaoDaLinha(tabela.chaves, linha.faixas)}; ${valor}; ${formula})`;
      }
      variaveis.push({ nome: nomeVariavelTabela(tabela.nome, saida), formula });
    });
  }
  return variaveis;
}

/** Variáveis do exame + as geradas pelas tabelas — o que os cálculos recebem. */
export function variaveisComTabelas(variaveis: VariavelExame[], tabelasJson: unknown): VariavelExame[] {
  return [...variaveis, ...compilarTabelas(parseTabelas(tabelasJson))];
}

/**
 * Validação estrutural das tabelas (nomes, chaves, saídas, números e faixas).
 * Referências inexistentes/ciclos são barrados depois pela validação das
 * variáveis geradas. Devolve o primeiro erro, ou `null`.
 */
export function validarTabelas(tabelas: TabelaReferencia[]): ErroTabela | null {
  const nomes = new Set<string>();
  for (let tabelaIndex = 0; tabelaIndex < tabelas.length; tabelaIndex++) {
    const tabela = tabelas[tabelaIndex];
    const erro = (mensagem: string): ErroTabela => ({ mensagem, tabelaIndex });
    const nome = tabela.nome.trim();
    if (!nome) return erro("Toda tabela de referência precisa de um nome");
    if (/[{}]/.test(nome) || nome.includes(".")) {
      return erro(`O nome da tabela "${nome}" não pode conter { } ou ponto`);
    }
    const chaveNome = normalizarTitulo(nome);
    if (nomes.has(chaveNome)) return erro(`Já existe uma tabela chamada "${nome}"`);
    nomes.add(chaveNome);

    if (tabela.chaves.length === 0) {
      return erro(`A tabela "${nome}" precisa de ao menos uma chave de busca (ex: Idade)`);
    }
    if (tabela.chaves.some((c) => !c.trim())) {
      return erro(`Toda chave de busca da tabela "${nome}" precisa de um nome`);
    }
    if (tabela.saidas.length === 0) {
      return erro(`A tabela "${nome}" precisa de ao menos uma coluna de resultado`);
    }
    const saidas = new Set<string>();
    for (const saida of tabela.saidas) {
      const s = saida.trim();
      if (!s) return erro(`Toda coluna de resultado da tabela "${nome}" precisa de um nome`);
      if (/[{}]/.test(s)) return erro(`O resultado "${s}" não pode conter { ou }`);
      if (saidas.has(normalizarTitulo(s))) {
        return erro(`A tabela "${nome}" tem dois resultados chamados "${s}"`);
      }
      saidas.add(normalizarTitulo(s));
    }
    if (tabela.linhas.length === 0) return erro(`A tabela "${nome}" precisa de ao menos uma linha`);

    for (let l = 0; l < tabela.linhas.length; l++) {
      const linha = tabela.linhas[l];
      for (let c = 0; c < tabela.chaves.length; c++) {
        const faixa = linha.faixas[c] ?? { min: "", max: "" };
        const min = numero(faixa.min);
        const max = numero(faixa.max);
        if ((faixa.min.trim() && min === null) || (faixa.max.trim() && max === null)) {
          return erro(`Linha ${l + 1} da tabela "${nome}": "${tabela.chaves[c].trim()}" precisa de números`);
        }
        if (min !== null && max !== null && min > max) {
          return erro(
            `Linha ${l + 1} da tabela "${nome}": em "${tabela.chaves[c].trim()}" o mínimo é maior que o máximo`,
          );
        }
      }
      for (let s = 0; s < tabela.saidas.length; s++) {
        if (numero(linha.valores[s] ?? "") === null) {
          return erro(
            `Linha ${l + 1} da tabela "${nome}": preencha um número em "${tabela.saidas[s].trim()}"`,
          );
        }
      }
    }
  }
  return null;
}

/** Renomeia uma chave de busca (coluna renomeada no cadastro) em todas as tabelas. */
export function renomearChaveTabelas(
  tabelas: TabelaReferencia[],
  antigo: string,
  novo: string,
): TabelaReferencia[] {
  const alvo = normalizarTitulo(antigo);
  if (!alvo) return tabelas;
  return tabelas.map((t) => ({
    ...t,
    chaves: t.chaves.map((c) => (normalizarTitulo(c) === alvo ? novo.trim() : c)),
  }));
}
