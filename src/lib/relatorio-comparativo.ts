import { parseGoniometriaValor } from "@/lib/goniometria";

export type ExameParaComparativo = {
  secoes: {
    id: string;
    nome: string;
    campos: {
      id: string;
      nome: string;
      repetivel: boolean;
      colunas: {
        id: string;
        titulo: string;
        tipo: string;
        formatacao: string | null;
        valorIdeal: string | null;
        direcaoIdeal: string | null;
        opcoes: string[];
        multiplaSelecao: boolean;
      }[];
    }[];
  }[];
};

export type ValorExecucao = { colunaId: string; valor: string; linha: number };

export type MovimentoIdeal = { nome: string; grauIdeal: string };

export type Classificacao = "proximo" | "moderado" | "distante";

export type LinhaComparativo = {
  chave: string;
  rotulo: string;
  lado: string | null;
  contexto: string | null;
  unidade: string | null;
  valorIdeal: string | null;
  avaliacaoValor: string | null;
  avaliacaoDist: number | null;
  avaliacaoNumero: number | null;
  retornoValor: string | null;
  retornoDist: number | null;
  retornoNumero: number | null;
  progresso: number | null;
  classificacaoAvaliacao: Classificacao | null;
  classificacaoRetorno: Classificacao | null;
};

export type SecaoComparativo = {
  id: string;
  nome: string;
  linhas: LinhaComparativo[];
};

export type PacienteInfo = {
  nome: string;
  idade: number | null;
  cpf: string | null;
  contato: string | null;
  objetivo: string | null;
  doencasPreexistentes: string | null;
  cirurgiasAnteriores: string | null;
  medicamentos: string | null;
  historicoClinico: string | null;
};

export type LinhaInfo = { label: string; valor: string };

export function montarDadosPaciente(paciente: PacienteInfo): LinhaInfo[] {
  return [
    { label: "Nome", valor: paciente.nome },
    paciente.idade ? { label: "Idade", valor: `${paciente.idade} anos` } : null,
    paciente.cpf ? { label: "CPF", valor: paciente.cpf } : null,
    paciente.contato ? { label: "Contato", valor: paciente.contato } : null,
  ].filter((linha): linha is LinhaInfo => linha !== null);
}

export function montarHistoricoClinico(paciente: PacienteInfo): LinhaInfo[] {
  return [
    paciente.objetivo ? { label: "Objetivo", valor: paciente.objetivo } : null,
    paciente.doencasPreexistentes
      ? { label: "Doenças pré-existentes", valor: paciente.doencasPreexistentes }
      : null,
    paciente.cirurgiasAnteriores
      ? { label: "Cirurgias anteriores", valor: paciente.cirurgiasAnteriores }
      : null,
    paciente.medicamentos
      ? { label: "Medicamentos", valor: paciente.medicamentos }
      : null,
    paciente.historicoClinico
      ? { label: "Histórico clínico", valor: paciente.historicoClinico }
      : null,
  ].filter((linha): linha is LinhaInfo => linha !== null);
}

export function montarSessao(
  exameNome: string,
  avaliacaoData: string,
  retornoData: string,
): LinhaInfo[] {
  return [
    { label: "Exame", valor: exameNome },
    { label: "Data da avaliação", valor: avaliacaoData },
    { label: "Data do retorno", valor: retornoData },
  ];
}

export type ItemGrafico = {
  chave: string;
  rotulo: string;
  avaliacao: number | null;
  retorno: number | null;
};

export type GraficoSecao = {
  titulo: string;
  itens: ItemGrafico[];
  sufixo: string;
};

function chunk<T>(itens: T[], tamanho: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    grupos.push(itens.slice(i, i + tamanho));
  }
  return grupos;
}

export function graficosDaSecao(
  secao: SecaoComparativo,
  itensPorGrafico = 2,
): GraficoSecao[] {
  const itensGraficaveis = secao.linhas
    .filter((linha) => linha.avaliacaoNumero !== null || linha.retornoNumero !== null)
    .map((linha) => ({
      chave: linha.chave,
      rotulo: linha.lado ? `${linha.rotulo} (${linha.lado})` : linha.rotulo,
      avaliacao: linha.avaliacaoNumero,
      retorno: linha.retornoNumero,
    }));

  if (itensGraficaveis.length === 0) return [];

  const ehGoniometria = secao.linhas.some((linha) => linha.contexto !== null);
  const unidades = new Set(
    secao.linhas.map((linha) => linha.unidade).filter(Boolean),
  );
  const sufixo = ehGoniometria
    ? "°"
    : unidades.size === 1
      ? ` ${[...unidades][0]}`
      : "";

  return chunk(itensGraficaveis, itensPorGrafico).map((grupo, index, grupos) => ({
    titulo:
      grupos.length > 1
        ? `${secao.nome} (parte ${index + 1} de ${grupos.length})`
        : secao.nome,
    itens: grupo,
    sufixo,
  }));
}

function extrairNumeros(texto: string): number[] {
  // Lookbehind evita que o hífen de uma faixa como "60-100" seja lido
  // como sinal de negativo do segundo número (viraria 60 e -100).
  const matches = texto.match(/(?<!\d)-?\d+(?:[.,]\d+)?/g);
  if (!matches) return [];
  return matches.map((m) => parseFloat(m.replace(",", ".")));
}

export function parseNumero(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  return numeros.length > 0 ? numeros[0] : null;
}

export function parseFaixaIdeal(
  texto: string | null | undefined,
): { min: number; max: number } | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  if (numeros.length === 0) return null;
  if (numeros.length === 1) return { min: numeros[0], max: numeros[0] };
  return { min: Math.min(...numeros), max: Math.max(...numeros) };
}

export function calcularDistancia(
  valor: number,
  faixa: { min: number; max: number },
): number {
  if (valor < faixa.min) return valor - faixa.min;
  if (valor > faixa.max) return valor - faixa.max;
  return 0;
}

/**
 * Só para Goniometria: o grau ideal de um movimento é cadastrado como uma
 * amplitude com direção (ex: "0-145" x "145-0" descrevem o mesmo intervalo,
 * mas com sentidos opostos de evolução). O alvo é sempre o ÚLTIMO número da
 * string — é isso que faz a distância "virar" dependendo da ordem em que os
 * números foram cadastrados no grau ideal do movimento.
 */
export function parseAlvoGoniometria(
  texto: string | null | undefined,
): number | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  return numeros.length > 0 ? numeros[numeros.length - 1] : null;
}

/**
 * Deriva um valor numérico "plotável" a partir de qualquer tipo de coluna,
 * mesmo quando o dado bruto é texto (ex: múltipla escolha de seleção única
 * vira a posição da opção escolhida na lista cadastrada, SIM_NAO vira 1/0).
 * Usado só para os gráficos consolidados — não afeta a distância/progresso
 * calculados para a tabela comparativa.
 */
export function numeroParaGrafico(
  tipo: string,
  opcoes: string[],
  multiplaSelecao: boolean,
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  if (tipo === "NUMERO") return parseNumero(raw);
  if (tipo === "SIM_NAO") return raw === "Sim" ? 1 : raw === "Não" ? 0 : null;
  if (tipo === "MULTIPLA_ESCOLHA" && !multiplaSelecao) {
    const indice = opcoes.indexOf(raw);
    return indice >= 0 ? indice : null;
  }
  return null;
}

export function classificarDistancia(dist: number): Classificacao {
  const abs = Math.abs(dist);
  if (abs <= 5) return "proximo";
  if (abs <= 15) return "moderado";
  return "distante";
}

function calcularProgresso(
  direcao: string | null,
  avaliacaoValor: number,
  retornoValor: number,
  faixa: { min: number; max: number } | null,
): number | null {
  if (direcao === "MAIOR_MELHOR") return retornoValor - avaliacaoValor;
  if (direcao === "MENOR_MELHOR") return avaliacaoValor - retornoValor;
  if (!faixa) return null;
  const distAvaliacao = Math.abs(calcularDistancia(avaliacaoValor, faixa));
  const distRetorno = Math.abs(calcularDistancia(retornoValor, faixa));
  return distAvaliacao - distRetorno;
}

function valorMapPorChave(valores: ValorExecucao[]) {
  const mapa = new Map<string, string>();
  for (const v of valores) mapa.set(`${v.colunaId}::${v.linha}`, v.valor);
  return mapa;
}

function linhasDoCampo(
  campo: ExameParaComparativo["secoes"][number]["campos"][number],
  avaliacaoValores: ValorExecucao[],
  retornoValores: ValorExecucao[],
): number[] {
  if (!campo.repetivel) return [0];
  const colunaIds = new Set(campo.colunas.map((c) => c.id));
  const linhas = new Set<number>();
  for (const v of [...avaliacaoValores, ...retornoValores]) {
    if (colunaIds.has(v.colunaId)) linhas.add(v.linha);
  }
  return linhas.size > 0 ? Array.from(linhas).sort((a, b) => a - b) : [0];
}

export function montarComparativo(
  exame: ExameParaComparativo,
  avaliacaoValores: ValorExecucao[],
  retornoValores: ValorExecucao[],
  movimentos: MovimentoIdeal[],
): SecaoComparativo[] {
  const avalMap = valorMapPorChave(avaliacaoValores);
  const retMap = valorMapPorChave(retornoValores);
  const movimentoPorNome = new Map(movimentos.map((m) => [m.nome, m]));

  const secoesResultado: SecaoComparativo[] = [];

  for (const secao of exame.secoes) {
    const linhas: LinhaComparativo[] = [];

    for (const campo of secao.campos) {
      const numerosLinha = linhasDoCampo(campo, avaliacaoValores, retornoValores);

      for (const linha of numerosLinha) {
        const sufixoEntrada =
          campo.repetivel && numerosLinha.length > 1
            ? ` (entrada ${numerosLinha.indexOf(linha) + 1})`
            : "";

        for (const coluna of campo.colunas) {
          const chave = `${coluna.id}::${linha}`;
          const avalRaw = avalMap.get(chave) ?? "";
          const retRaw = retMap.get(chave) ?? "";

          if (coluna.tipo === "GONIOMETRIA") {
            const avalEntries = parseGoniometriaValor(avalRaw);
            const retEntries = parseGoniometriaValor(retRaw);
            const chaveEntry = (e: { nome: string; lado?: string }) =>
              `${e.nome}::${e.lado ?? ""}`;
            const ordemLado = ["", "Esquerdo", "Direito", "Bilateral"];
            const chavesMovimento = Array.from(
              new Set([
                ...avalEntries.map(chaveEntry),
                ...retEntries.map(chaveEntry),
              ]),
            ).sort((a, b) => {
              const [nomeA, ladoA] = a.split("::");
              const [nomeB, ladoB] = b.split("::");
              if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
              return ordemLado.indexOf(ladoA) - ordemLado.indexOf(ladoB);
            });

            for (const chaveMovimento of chavesMovimento) {
              const avalEntry = avalEntries.find(
                (e) => chaveEntry(e) === chaveMovimento,
              );
              const retEntry = retEntries.find(
                (e) => chaveEntry(e) === chaveMovimento,
              );
              const nome = (avalEntry ?? retEntry)!.nome;
              const lado = (avalEntry ?? retEntry)!.lado;
              const idealTexto = movimentoPorNome.get(nome)?.grauIdeal ?? null;
              const alvo = parseAlvoGoniometria(idealTexto);
              const avalNum = parseNumero(avalEntry?.grauAlcancado);
              const retNum = parseNumero(retEntry?.grauAlcancado);
              const avalDist =
                alvo !== null && avalNum !== null ? avalNum - alvo : null;
              const retDist =
                alvo !== null && retNum !== null ? retNum - alvo : null;
              const progresso =
                avalDist !== null && retDist !== null
                  ? Math.abs(avalDist) - Math.abs(retDist)
                  : null;

              linhas.push({
                chave: `${chave}::${chaveMovimento}`,
                rotulo: nome,
                lado: lado || null,
                contexto: coluna.titulo,
                unidade: null,
                valorIdeal: idealTexto,
                avaliacaoValor: avalEntry?.grauAlcancado || null,
                avaliacaoDist: avalDist,
                avaliacaoNumero: avalNum,
                retornoValor: retEntry?.grauAlcancado || null,
                retornoDist: retDist,
                retornoNumero: retNum,
                progresso,
                classificacaoAvaliacao:
                  avalDist !== null ? classificarDistancia(avalDist) : null,
                classificacaoRetorno:
                  retDist !== null ? classificarDistancia(retDist) : null,
              });
            }
            continue;
          }

          if (!avalRaw && !retRaw) continue;

          const rotulo = campo.nome
            ? `${campo.nome} — ${coluna.titulo}${sufixoEntrada}`
            : `${coluna.titulo}${sufixoEntrada}`;

          let avalDist: number | null = null;
          let retDist: number | null = null;
          let progresso: number | null = null;
          const faixa =
            coluna.tipo === "NUMERO" ? parseFaixaIdeal(coluna.valorIdeal) : null;

          const avalNumGrafico = numeroParaGrafico(
            coluna.tipo,
            coluna.opcoes,
            coluna.multiplaSelecao,
            avalRaw,
          );
          const retNumGrafico = numeroParaGrafico(
            coluna.tipo,
            coluna.opcoes,
            coluna.multiplaSelecao,
            retRaw,
          );

          if (faixa) {
            avalDist =
              avalNumGrafico !== null
                ? calcularDistancia(avalNumGrafico, faixa)
                : null;
            retDist =
              retNumGrafico !== null
                ? calcularDistancia(retNumGrafico, faixa)
                : null;
            progresso =
              avalNumGrafico !== null && retNumGrafico !== null
                ? calcularProgresso(
                    coluna.direcaoIdeal,
                    avalNumGrafico,
                    retNumGrafico,
                    faixa,
                  )
                : null;
          }

          linhas.push({
            chave,
            rotulo,
            lado: null,
            contexto: null,
            unidade: coluna.formatacao,
            valorIdeal: coluna.tipo === "NUMERO" ? coluna.valorIdeal : null,
            avaliacaoValor: avalRaw || null,
            avaliacaoDist: avalDist,
            avaliacaoNumero: avalNumGrafico,
            retornoValor: retRaw || null,
            retornoDist: retDist,
            retornoNumero: retNumGrafico,
            progresso,
            classificacaoAvaliacao:
              avalDist !== null ? classificarDistancia(avalDist) : null,
            classificacaoRetorno:
              retDist !== null ? classificarDistancia(retDist) : null,
          });
        }
      }
    }

    if (linhas.length > 0) {
      secoesResultado.push({ id: secao.id, nome: secao.nome, linhas });
    }
  }

  return secoesResultado;
}
