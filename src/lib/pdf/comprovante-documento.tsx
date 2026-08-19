import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

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
  logo: { width: 120, height: 78, objectFit: "contain", alignSelf: "center" },
  tituloBox: {
    marginTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: CORES.primary,
  },
  titulo: { fontSize: 14, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: CORES.mutedTexto, marginTop: 2 },
  aviso: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#fef3c7",
    fontSize: 8,
    color: "#92400e",
  },
  card: { marginTop: 14, borderWidth: 1, borderColor: CORES.borda },
  cardTitulo: {
    fontSize: 10,
    fontWeight: 700,
    padding: 8,
    backgroundColor: CORES.primary,
    color: "#ffffff",
  },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  linhaLabel: { width: "34%", fontWeight: 700, color: CORES.primary },
  linhaValor: { width: "66%" },
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
  colParcela: { width: "20%" },
  colVencimento: { width: "30%" },
  colValor: { width: "25%" },
  colStatus: { width: "25%" },
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
});

export type LinhaInfo = { label: string; valor: string };

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

export type ParcelaComprovante = {
  numero: number;
  vencimento: string;
  valor: string;
  status: string;
};

export type ComprovantePdfProps = {
  numero: string;
  geradoEm: string;
  prestador: LinhaInfo[];
  tomador: LinhaInfo[];
  servico: LinhaInfo[];
  valores: LinhaInfo[];
  parcelas: ParcelaComprovante[];
};

export function ComprovantePdfDocument({
  numero,
  geradoEm,
  prestador,
  tomador,
  servico,
  valores,
  parcelas,
}: ComprovantePdfProps) {
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
        <View style={styles.tituloBox}>
          <Text style={styles.titulo}>Comprovante de cobrança — {numero}</Text>
          <Text style={styles.subtitulo}>
            Documento com os dados necessários para emissão da nota fiscal de
            serviço. Não substitui a NF-e/NFS-e.
          </Text>
        </View>

        <InfoCard titulo="Prestador do serviço" linhas={prestador} />
        <InfoCard titulo="Tomador do serviço" linhas={tomador} />
        <InfoCard titulo="Discriminação do serviço" linhas={servico} />
        <InfoCard titulo="Valores" linhas={valores} />

        {parcelas.length > 0 && (
          <View style={styles.card} wrap={false}>
            <Text style={styles.cardTitulo}>Parcelas</Text>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.tabelaHeaderCel, styles.colParcela]}>Parcela</Text>
              <Text style={[styles.tabelaHeaderCel, styles.colVencimento]}>Vencimento</Text>
              <Text style={[styles.tabelaHeaderCel, styles.colValor]}>Valor</Text>
              <Text style={[styles.tabelaHeaderCel, styles.colStatus]}>Status</Text>
            </View>
            {parcelas.map((parcela) => (
              <View key={parcela.numero} style={styles.tabelaLinha}>
                <Text style={styles.colParcela}>{parcela.numero}</Text>
                <Text style={styles.colVencimento}>{parcela.vencimento}</Text>
                <Text style={styles.colValor}>{parcela.valor}</Text>
                <Text style={styles.colStatus}>{parcela.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          {`Gerado automaticamente em ${geradoEm} — FisioTrainer Centro de Reabilitação e Performance`}
        </Text>
      </Page>
    </Document>
  );
}
