import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { FONTE_ASSINATURA } from "@/lib/pdf/fonts";

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
  subtitulo: { fontSize: 9, color: CORES.mutedTexto, marginTop: 2 },
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
  cardBody: { padding: 8 },
  campo: { marginBottom: 8 },
  campoLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: CORES.primary,
    marginBottom: 2,
  },
  campoValor: { fontSize: 9, lineHeight: 1.4 },
  vitaisGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vitalItem: { minWidth: 70 },
  vitalLabel: { fontSize: 7, color: CORES.mutedTexto },
  vitalValor: { fontSize: 9, fontWeight: 700 },
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
});

export type ProfissionalInfo = {
  nome: string;
  cref?: string | null;
  crefito?: string | null;
} | null;

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Text style={styles.campoValor}>{valor || "—"}</Text>
    </View>
  );
}

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

export type EvolucaoPdfProps = {
  pacienteNome: string;
  dataFormatada: string;
  hdp: string;
  hda: string;
  pa: string;
  fc: string;
  spo2: string;
  fr: string;
  temperatura: string;
  auscultaPulmonar: string | null;
  evolucao: string;
  conduta: string;
  profissional: ProfissionalInfo;
  geradoEm: string;
};

export function EvolucaoPdfDocument({
  pacienteNome,
  dataFormatada,
  hdp,
  hda,
  pa,
  fc,
  spo2,
  fr,
  temperatura,
  auscultaPulmonar,
  evolucao,
  conduta,
  profissional,
  geradoEm,
}: EvolucaoPdfProps) {
  const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
        <View style={styles.tituloBox}>
          <Text style={styles.titulo}>Ficha de Evolução — {pacienteNome}</Text>
          <Text style={styles.subtitulo}>{dataFormatada}</Text>
        </View>

        <View style={styles.card} wrap={false}>
          <Text style={styles.cardTitulo}>Histórico</Text>
          <View style={styles.cardBody}>
            <Campo label="HDP (Histórico da Doença Pregressa)" valor={hdp} />
            <Campo label="HDA (Histórico da Doença Atual)" valor={hda} />
          </View>
        </View>

        <View style={styles.card} wrap={false}>
          <Text style={styles.cardTitulo}>Sinais Vitais</Text>
          <View style={[styles.cardBody, styles.vitaisGrid]}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>PA</Text>
              <Text style={styles.vitalValor}>{pa || "—"}</Text>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>FC</Text>
              <Text style={styles.vitalValor}>{fc || "—"}</Text>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>SpO2</Text>
              <Text style={styles.vitalValor}>{spo2 || "—"}</Text>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>FR</Text>
              <Text style={styles.vitalValor}>{fr || "—"}</Text>
            </View>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>Temperatura</Text>
              <Text style={styles.vitalValor}>{temperatura || "—"}</Text>
            </View>
          </View>
        </View>

        {auscultaPulmonar && (
          <View style={styles.card} wrap={false}>
            <Text style={styles.cardTitulo}>Ausculta Pulmonar</Text>
            <View style={styles.cardBody}>
              <Text style={styles.campoValor}>{auscultaPulmonar}</Text>
            </View>
          </View>
        )}

        <View style={styles.card} wrap={false}>
          <Text style={styles.cardTitulo}>Evolução</Text>
          <View style={styles.cardBody}>
            <Campo label="Evolução" valor={evolucao} />
            <Campo label="Conduta" valor={conduta} />
          </View>
        </View>

        <Carimbo profissional={profissional} />

        <Text style={styles.footer} fixed>
          {`Gerado automaticamente em ${geradoEm} — Fisiotrainer Centro de Reabilitação e Performance`}
        </Text>
      </Page>
    </Document>
  );
}
