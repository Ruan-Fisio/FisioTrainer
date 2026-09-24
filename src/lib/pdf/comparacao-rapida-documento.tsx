import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Polyline,
  Circle,
  Line,
  StyleSheet,
} from "@react-pdf/renderer";
import { parseGoniometriaValor } from "@/lib/goniometria";
import { parseSelecionadas } from "@/lib/multipla-escolha";
import type { SecaoComparacaoRapida, SerieNumerica } from "@/lib/comparacao-rapida";

const CORES = {
  primary: "#1d3b86",
  texto: "#111827",
  mutedTexto: "#6b7280",
  borda: "#e5e7eb",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    color: CORES.texto,
    fontFamily: "Helvetica",
  },
  logo: { width: 150, height: 98, objectFit: "contain", alignSelf: "center" },
  tituloBox: {
    marginTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: CORES.primary,
  },
  titulo: { fontSize: 14, fontWeight: 700 },
  card: { marginTop: 14, borderWidth: 1, borderColor: CORES.borda },
  cardTitulo: {
    fontSize: 10,
    fontWeight: 700,
    padding: 8,
    backgroundColor: CORES.primary,
    color: "#ffffff",
  },
  tabelaHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tabelaHeaderCel: { fontWeight: 700, fontSize: 8, color: CORES.mutedTexto },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
    paddingTop: 6,
    fontSize: 7,
    color: CORES.mutedTexto,
  },
  carimbo: { position: "absolute", bottom: 50, left: 32, right: 32, alignItems: "center" },
  carimboNome: { fontSize: 9, fontWeight: 400, textAlign: "center" },
  carimboRegistro: { marginTop: 2, fontSize: 8, color: CORES.mutedTexto, textAlign: "center" },
});

function valorTextoPdf(
  tipo: string,
  multiplaSelecao: boolean,
  valor: string | undefined,
): string {
  if (!valor) return "—";

  if (tipo === "GONIOMETRIA") {
    const entries = parseGoniometriaValor(valor);
    if (entries.length === 0) return "—";
    return entries
      .map(
        (entry) =>
          `${entry.nome}${entry.lado ? ` (${entry.lado})` : ""}${entry.grauAlcancado ? `: ${entry.grauAlcancado}` : ""}`,
      )
      .join("; ");
  }

  if (tipo === "MULTIPLA_ESCOLHA" && multiplaSelecao) {
    return parseSelecionadas(valor).filter(Boolean).join(", ") || "—";
  }

  return valor || "—";
}

type ExecucaoLabel = { id: string; label: string };

function SecaoTabelaRapida({
  secao,
  execucoes,
}: {
  secao: SecaoComparacaoRapida;
  execucoes: ExecucaoLabel[];
}) {
  const colCampoWidth = 32;
  const colValorWidth = (100 - colCampoWidth) / execucoes.length;

  return (
    <View style={styles.card} wrap={false}>
      <Text style={styles.cardTitulo}>{secao.nome}</Text>
      <View style={styles.tabelaHeader}>
        <Text style={[styles.tabelaHeaderCel, { width: `${colCampoWidth}%` }]}>
          Campo
        </Text>
        {execucoes.map((execucao) => (
          <Text
            key={execucao.id}
            style={[styles.tabelaHeaderCel, { width: `${colValorWidth}%` }]}
          >
            {execucao.label}
          </Text>
        ))}
      </View>
      {secao.linhas.map((linha) => (
        <View key={`${linha.coluna.id}::${linha.linha}`} style={styles.tabelaLinha}>
          <View style={{ width: `${colCampoWidth}%` }}>
            <Text style={{ fontWeight: 700 }}>{linha.coluna.titulo}</Text>
            {(linha.campoNome || linha.repetivel) && (
              <Text style={{ color: CORES.mutedTexto, fontSize: 7, marginTop: 2 }}>
                {linha.campoNome}
                {linha.repetivel ? ` — Entrada ${linha.linha + 1}` : ""}
              </Text>
            )}
          </View>
          {execucoes.map((execucao) => (
            <Text key={execucao.id} style={{ width: `${colValorWidth}%` }}>
              {valorTextoPdf(
                linha.coluna.tipo,
                linha.coluna.multiplaSelecao,
                linha.valoresPorExecucaoId.get(execucao.id),
              )}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const CHART_WIDTH = 480;
const CHART_HEIGHT = 90;
const CHART_PAD_RIGHT = 8;
const CHART_PAD_TOP = 14;
const CHART_LABEL_ALTURA = 16;
const CHART_EIXO_TICK = 3;

function arredondar(v: number) {
  return Math.round(v * 100) / 100;
}

function GraficoLinha({
  serie,
  execucoesLabels,
}: {
  serie: SerieNumerica;
  execucoesLabels: string[];
}) {
  const valores = serie.pontos.map((p) => p.valor);
  const preenchidos = valores.filter((v): v is number => v !== null);
  if (preenchidos.length === 0) return null;

  const min = Math.min(...preenchidos);
  const max = Math.max(...preenchidos);
  const amplitude = max - min || 1;
  const n = valores.length;
  const sufixo = serie.unidade ? ` ${serie.unidade}` : "";

  const ticksEixo = min === max ? [min] : [min, (min + max) / 2, max];
  const rotulosEixo = ticksEixo.map((t) => `${arredondar(t)}${sufixo}`);
  const maiorRotulo = Math.max(...rotulosEixo.map((r) => r.length));
  // Régua de valores à esquerda: a largura reservada acompanha o rótulo
  // mais longo (ex. unidade tipo "bpm" precisa de mais espaço que "%").
  const padLeft = 12 + maiorRotulo * 3.3;
  const plotWidth = CHART_WIDTH - padLeft - CHART_PAD_RIGHT;

  function coordX(i: number) {
    return n === 1
      ? padLeft + plotWidth / 2
      : padLeft + (i / (n - 1)) * plotWidth;
  }
  function coordY(v: number) {
    return CHART_PAD_TOP + CHART_HEIGHT - ((v - min) / amplitude) * CHART_HEIGHT;
  }

  const segmentos: { x: number; y: number }[][] = [];
  let atual: { x: number; y: number }[] = [];
  valores.forEach((v, i) => {
    if (v === null) {
      if (atual.length > 0) {
        segmentos.push(atual);
        atual = [];
      }
      return;
    }
    atual.push({ x: coordX(i), y: coordY(v) });
  });
  if (atual.length > 0) segmentos.push(atual);

  const alturaSvg = CHART_PAD_TOP + CHART_HEIGHT + CHART_LABEL_ALTURA;

  /** Nos extremos, ancorar a partir da borda em vez de centralizar evita que
   * o rótulo (ex. a data, mais larga que o valor) seja cortado pela borda
   * do Svg — só o ponto do meio pode se dar ao luxo do "middle". */
  function textAnchor(i: number): "start" | "middle" | "end" {
    if (n === 1) return "middle";
    if (i === 0) return "start";
    if (i === n - 1) return "end";
    return "middle";
  }

  return (
    <View
      style={{ width: "100%", borderWidth: 1, borderColor: CORES.borda, padding: 8, marginBottom: 10 }}
      wrap={false}
    >
      <Text style={{ fontSize: 9, fontWeight: 700, color: CORES.primary, marginBottom: 4 }}>
        {serie.titulo}
      </Text>
      <Svg width={CHART_WIDTH} height={alturaSvg}>
        <Line
          x1={padLeft}
          y1={CHART_PAD_TOP + CHART_HEIGHT}
          x2={CHART_WIDTH - CHART_PAD_RIGHT}
          y2={CHART_PAD_TOP + CHART_HEIGHT}
          stroke={CORES.borda}
          strokeWidth={1}
        />
        <Line
          x1={padLeft}
          y1={CHART_PAD_TOP}
          x2={padLeft}
          y2={CHART_PAD_TOP + CHART_HEIGHT}
          stroke={CORES.borda}
          strokeWidth={1}
        />
        {ticksEixo.map((t, i) => {
          const ty = coordY(t);
          return (
            <Line
              key={`tick-${i}`}
              x1={padLeft - CHART_EIXO_TICK}
              y1={ty}
              x2={padLeft}
              y2={ty}
              stroke={CORES.borda}
              strokeWidth={1}
            />
          );
        })}
        {ticksEixo.map((t, i) => (
          <Text
            key={`tick-label-${i}`}
            x={padLeft - CHART_EIXO_TICK - 2}
            y={coordY(t) + 2}
            style={{ fontSize: 6, fill: CORES.mutedTexto, textAnchor: "end" }}
          >
            {rotulosEixo[i]}
          </Text>
        ))}
        {segmentos.map((segmento, i) => (
          <Polyline
            key={i}
            points={segmento.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={CORES.primary}
            strokeWidth={2}
          />
        ))}
        {valores.map((v, i) =>
          v === null ? null : (
            <Circle key={i} cx={coordX(i)} cy={coordY(v)} r={2.5} fill={CORES.primary} />
          ),
        )}
        {valores.map((v, i) =>
          v === null ? null : (
            <Text
              key={`label-${i}`}
              x={coordX(i)}
              y={coordY(v) - 6}
              style={{ fontSize: 6.5, fontWeight: 700, fill: CORES.primary, textAnchor: textAnchor(i) }}
            >
              {`${arredondar(v)}${sufixo}`}
            </Text>
          ),
        )}
        {execucoesLabels.map((label, i) => (
          <Text
            key={`data-${i}`}
            x={coordX(i)}
            y={CHART_PAD_TOP + CHART_HEIGHT + 11}
            style={{ fontSize: 6, fill: CORES.mutedTexto, textAnchor: textAnchor(i) }}
          >
            {label}
          </Text>
        ))}
      </Svg>
    </View>
  );
}

export type ProfissionalInfo = {
  nome: string;
  cref?: string | null;
  crefito?: string | null;
} | null;

function Carimbo({ profissional }: { profissional: ProfissionalInfo }) {
  if (!profissional) return null;
  const registro = [
    profissional.cref ? `CREF ${profissional.cref}` : null,
    profissional.crefito ? `CREFITO ${profissional.crefito}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <View style={styles.carimbo} wrap={false}>
      <Text style={styles.carimboNome}>{profissional.nome}</Text>
      {registro && <Text style={styles.carimboRegistro}>{registro}</Text>}
    </View>
  );
}

export type ComparacaoRapidaPdfProps = {
  pacienteNome: string;
  exameNome: string;
  execucoes: ExecucaoLabel[];
  secoes: SecaoComparacaoRapida[];
  series: SerieNumerica[];
  profissional?: ProfissionalInfo;
  geradoEm: string;
};

export function ComparacaoRapidaPdfDocument({
  pacienteNome,
  exameNome,
  execucoes,
  secoes,
  series,
  profissional,
  geradoEm,
}: ComparacaoRapidaPdfProps) {
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
        <View style={styles.tituloBox}>
          <Text style={styles.titulo}>
            Comparação rápida — {exameNome} — {pacienteNome}
          </Text>
        </View>

        {secoes.length === 0 && (
          <Text style={{ marginTop: 14, color: CORES.mutedTexto }}>
            Nenhum valor preenchido nas execuções selecionadas.
          </Text>
        )}

        <View style={{ marginTop: 4 }}>
          {secoes.map((secao) => (
            <SecaoTabelaRapida key={secao.id} secao={secao} execucoes={execucoes} />
          ))}
        </View>

        {series.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              Evolução dos valores numéricos
            </Text>
            {series.map((serie) => (
              <GraficoLinha
                key={serie.chave}
                serie={serie}
                execucoesLabels={execucoes.map((e) => e.label)}
              />
            ))}
          </View>
        )}

        <Carimbo profissional={profissional ?? null} />

        <Text style={styles.footer} fixed>
          {`Gerado automaticamente em ${geradoEm} — FisioTrainer Centro de Reabilitação e Performance`}
        </Text>
      </Page>
    </Document>
  );
}
