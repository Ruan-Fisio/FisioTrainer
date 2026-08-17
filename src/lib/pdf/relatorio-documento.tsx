import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  Classificacao,
  GraficoSecao,
  LinhaInfo,
  SecaoComparativo,
} from "@/lib/relatorio-comparativo";
import { FONTE_ASSINATURA } from "@/lib/pdf/fonts";

const CORES = {
  primary: "#1d3b86",
  accent: "#f19c09",
  texto: "#111827",
  mutedTexto: "#6b7280",
  borda: "#e5e7eb",
  proximoBg: "#d1fae5",
  proximoTexto: "#047857",
  moderadoBg: "#fef3c7",
  moderadoTexto: "#b45309",
  distanteBg: "#fee2e2",
  distanteTexto: "#b91c1c",
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
  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 6,
  },
  cardTitulo: {
    fontSize: 10,
    fontWeight: 700,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  linhaLabel: { width: "33%", fontWeight: 700, color: CORES.primary },
  linhaValor: { width: "67%" },
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
    alignItems: "center",
  },
  colCampo: { width: "34%" },
  colValor: { width: "11%" },
  legenda: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
    fontSize: 8,
    color: CORES.mutedTexto,
  },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaSwatch: { width: 7, height: 7, borderRadius: 1 },
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
  carimbo: {
    position: "absolute",
    bottom: 50,
    left: 32,
    right: 32,
    alignItems: "center",
  },
  carimboAssinatura: {
    width: 200,
    fontFamily: FONTE_ASSINATURA,
    fontSize: 26,
    color: CORES.texto,
    textAlign: "center",
  },
  carimboLinha: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: CORES.texto,
  },
  carimboNome: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
  },
  carimboRegistro: {
    marginTop: 2,
    fontSize: 8,
    color: CORES.mutedTexto,
    textAlign: "center",
  },
  historicoDestaque: {
    marginTop: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
  },
  historicoDestaqueTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: CORES.primary,
    marginBottom: 4,
  },
});

function classificacaoCores(classificacao: Classificacao | null) {
  if (classificacao === "proximo")
    return { bg: CORES.proximoBg, texto: CORES.proximoTexto };
  if (classificacao === "moderado")
    return { bg: CORES.moderadoBg, texto: CORES.moderadoTexto };
  if (classificacao === "distante")
    return { bg: CORES.distanteBg, texto: CORES.distanteTexto };
  return { bg: "transparent", texto: CORES.mutedTexto };
}

function formatarSinal(valor: number) {
  const arredondado = Math.round(valor * 10) / 10;
  return arredondado > 0 ? `+${arredondado}` : `${arredondado}`;
}

function InfoCard({ titulo, linhas }: { titulo: string; linhas: LinhaInfo[] }) {
  if (linhas.length === 0) return null;
  return (
    <View style={styles.card} wrap={false}>
      <Text style={styles.cardTitulo}>{titulo}</Text>
      {linhas.map((linha, i) => (
        <View
          key={linha.label}
          style={[styles.linha, i === linhas.length - 1 ? { borderBottomWidth: 0 } : {}]}
        >
          <Text style={styles.linhaLabel}>{linha.label}</Text>
          <Text style={styles.linhaValor}>{linha.valor}</Text>
        </View>
      ))}
    </View>
  );
}

function SecaoTabela({ secao }: { secao: SecaoComparativo }) {
  const temIdeal = secao.linhas.some((linha) => linha.valorIdeal !== null);
  const colCampoStyle = temIdeal ? styles.colCampo : { width: "40%" };
  const colValorStyle = temIdeal ? styles.colValor : { width: "20%" };

  return (
    <View style={styles.card} wrap={false}>
      <Text style={styles.cardTitulo}>{secao.nome}</Text>
      <View style={styles.tabelaHeader}>
        <Text style={[styles.tabelaHeaderCel, colCampoStyle]}>Campo</Text>
        {temIdeal && (
          <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Ideal</Text>
        )}
        <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Avaliação</Text>
        {temIdeal && (
          <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Dist.</Text>
        )}
        <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Retorno</Text>
        {temIdeal && (
          <>
            <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Dist.</Text>
            <Text style={[styles.tabelaHeaderCel, colValorStyle]}>Progr.</Text>
          </>
        )}
      </View>
      {secao.linhas.map((linha) => {
        const cores = classificacaoCores(linha.classificacaoAvaliacao);
        const coresRetorno = classificacaoCores(linha.classificacaoRetorno);
        const progressoCor =
          linha.progresso === null
            ? CORES.mutedTexto
            : linha.progresso > 0
              ? CORES.proximoTexto
              : linha.progresso < 0
                ? CORES.distanteTexto
                : CORES.texto;
        return (
          <View key={linha.chave} style={styles.tabelaLinha}>
            <View style={colCampoStyle}>
              <Text style={{ fontWeight: 700 }}>{linha.rotulo}</Text>
              {linha.lado && (
                <Text
                  style={{
                    marginTop: 2,
                    alignSelf: "flex-start",
                    backgroundColor: "#f3f4f6",
                    color: CORES.mutedTexto,
                    fontSize: 6,
                    fontWeight: 700,
                    paddingVertical: 1,
                    paddingHorizontal: 3,
                    borderRadius: 2,
                  }}
                >
                  {linha.lado}
                </Text>
              )}
              {linha.contexto && (
                <Text style={{ color: CORES.mutedTexto, fontSize: 7, marginTop: 2 }}>
                  {linha.contexto}
                </Text>
              )}
            </View>
            {temIdeal && (
              <Text style={colValorStyle}>{linha.valorIdeal ?? "—"}</Text>
            )}
            <Text style={colValorStyle}>{linha.avaliacaoValor ?? "—"}</Text>
            {temIdeal && (
              <View style={colValorStyle}>
                <Text
                  style={{
                    backgroundColor: cores.bg,
                    color: cores.texto,
                    fontWeight: 700,
                    paddingVertical: 2,
                    paddingHorizontal: 4,
                    borderRadius: 3,
                    alignSelf: "flex-start",
                  }}
                >
                  {linha.avaliacaoDist !== null ? formatarSinal(linha.avaliacaoDist) : "—"}
                </Text>
              </View>
            )}
            <Text style={colValorStyle}>{linha.retornoValor ?? "—"}</Text>
            {temIdeal && (
              <>
                <View style={colValorStyle}>
                  <Text
                    style={{
                      backgroundColor: coresRetorno.bg,
                      color: coresRetorno.texto,
                      fontWeight: 700,
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      borderRadius: 3,
                      alignSelf: "flex-start",
                    }}
                  >
                    {linha.retornoDist !== null ? formatarSinal(linha.retornoDist) : "—"}
                  </Text>
                </View>
                <Text style={[colValorStyle, { color: progressoCor, fontWeight: 700 }]}>
                  {linha.progresso !== null ? formatarSinal(linha.progresso) : "—"}
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const CHART_ALTURA_PLOT = 80;
const CHART_LARGURA_BARRA = 16;

/**
 * Barras montadas com flexbox (View) em vez de SVG: um viewBox com largura
 * fixa e `preserveAspectRatio` acaba renderizando o desenho em escala 1:1
 * encostado à esquerda, enquanto a faixa de rótulos ocupa 100% da largura —
 * as duas linhas deixam de se alinhar. Com flex, cada coluna de barras e seu
 * rótulo dividem a largura pelo mesmo `flex: 1`.
 */
function GraficoBarras({ grafico }: { grafico: GraficoSecao }) {
  const maiorValor = Math.max(
    1,
    ...grafico.itens.flatMap((item) => [item.avaliacao ?? 0, item.retorno ?? 0]),
  );

  function alturaBarra(valor: number) {
    return Math.max((Math.abs(valor) / maiorValor) * CHART_ALTURA_PLOT, 1);
  }

  return (
    <View
      style={{
        width: "100%",
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 6,
        padding: 8,
        marginBottom: 10,
      }}
      wrap={false}
    >
      <Text style={{ fontSize: 9, fontWeight: 700, color: CORES.primary, marginBottom: 6 }}>
        {grafico.titulo}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: CHART_ALTURA_PLOT + 14,
          borderBottomWidth: 1,
          borderBottomColor: CORES.borda,
        }}
      >
        {grafico.itens.map((item) => (
          <View
            key={item.chave}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            {item.avaliacao !== null && (
              <View style={{ alignItems: "center", marginHorizontal: 2 }}>
                <Text
                  style={{
                    fontSize: 6.5,
                    fontWeight: 700,
                    color: CORES.primary,
                    marginBottom: 2,
                  }}
                >
                  {`${Math.round(item.avaliacao)}${grafico.sufixo}`}
                </Text>
                <View
                  style={{
                    width: CHART_LARGURA_BARRA,
                    height: alturaBarra(item.avaliacao),
                    backgroundColor: CORES.primary,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
              </View>
            )}
            {item.retorno !== null && (
              <View style={{ alignItems: "center", marginHorizontal: 2 }}>
                <Text
                  style={{
                    fontSize: 6.5,
                    fontWeight: 700,
                    color: "#b06f06",
                    marginBottom: 2,
                  }}
                >
                  {`${Math.round(item.retorno)}${grafico.sufixo}`}
                </Text>
                <View
                  style={{
                    width: CHART_LARGURA_BARRA,
                    height: alturaBarra(item.retorno),
                    backgroundColor: CORES.accent,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row" }}>
        {grafico.itens.map((item) => (
          <Text
            key={item.chave}
            style={{
              flex: 1,
              fontSize: 6,
              color: CORES.mutedTexto,
              textAlign: "center",
              marginTop: 4,
              paddingHorizontal: 2,
            }}
          >
            {item.rotulo}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type ProfissionalInfo = {
  nome: string;
  cref?: string | null;
  crefito?: string | null;
} | null;

export type RelatorioPdfProps = {
  titulo: string;
  pacienteNome: string;
  dadosPaciente: LinhaInfo[];
  historico: LinhaInfo[];
  sessao: LinhaInfo[];
  secoes: SecaoComparativo[];
  graficos: GraficoSecao[];
  temLinhaComIdeal: boolean;
  geradoEm: string;
  profissional?: ProfissionalInfo;
  historicoClinico?: string | null;
};

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
      <Text style={styles.carimboAssinatura}>{profissional.nome}</Text>
      <View style={styles.carimboLinha} />
      <Text style={styles.carimboNome}>{profissional.nome}</Text>
      {registro && <Text style={styles.carimboRegistro}>{registro}</Text>}
    </View>
  );
}

export function RelatorioPdfDocument({
  titulo,
  pacienteNome,
  dadosPaciente,
  historico,
  sessao,
  secoes,
  graficos,
  temLinhaComIdeal,
  geradoEm,
  profissional,
  historicoClinico,
}: RelatorioPdfProps) {
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
        <View style={styles.tituloBox}>
          <Text style={styles.titulo}>{titulo} — {pacienteNome}</Text>
        </View>

        {historicoClinico && (
          <View style={styles.historicoDestaque} wrap={false}>
            <Text style={styles.historicoDestaqueTitulo}>Histórico clínico</Text>
            <Text>{historicoClinico}</Text>
          </View>
        )}

        <InfoCard titulo="Dados do paciente" linhas={dadosPaciente} />
        <InfoCard titulo="Histórico clínico" linhas={historico} />
        <InfoCard titulo="Sessão" linhas={sessao} />

        {secoes.length === 0 && (
          <Text style={{ marginTop: 14, color: CORES.mutedTexto }}>
            Nenhum valor preenchido em comum entre a avaliação e o retorno selecionado.
          </Text>
        )}

        <View style={{ marginTop: 4 }}>
          {secoes.map((secao) => (
            <SecaoTabela key={secao.id} secao={secao} />
          ))}
        </View>

        {temLinhaComIdeal && (
          <View style={styles.legenda}>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaSwatch, { backgroundColor: CORES.proximoTexto }]} />
              <Text>Próximo do ideal (dist. ≤ 5)</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaSwatch, { backgroundColor: CORES.moderadoTexto }]} />
              <Text>Distância moderada (5–15)</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.legendaSwatch, { backgroundColor: CORES.distanteTexto }]} />
              <Text>Distante do ideal (&gt; 15)</Text>
            </View>
          </View>
        )}

        {graficos.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <View wrap={false}>
              <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Gráficos Consolidados — Avaliação x Retorno
              </Text>
              <GraficoBarras grafico={graficos[0]} />
            </View>
            {graficos.slice(1).map((grafico) => (
              <GraficoBarras key={grafico.titulo} grafico={grafico} />
            ))}
          </View>
        )}

        <Carimbo profissional={profissional ?? null} />

        <Text style={styles.footer} fixed>
          {`Gerado automaticamente em ${geradoEm} — Fisiotrainer Centro de Reabilitação e Performance`}
        </Text>
      </Page>
    </Document>
  );
}
