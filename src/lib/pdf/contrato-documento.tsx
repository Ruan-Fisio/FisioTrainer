import fs from "node:fs";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BlocoContrato } from "@/lib/contrato-modelo";

const CORES = {
  primary: "#1d3b86",
  texto: "#111827",
  mutedTexto: "#6b7280",
  borda: "#e5e7eb",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 10,
    color: CORES.texto,
    fontFamily: "Helvetica",
  },
  logo: { width: 110, height: 72, objectFit: "contain", alignSelf: "center", marginBottom: 12 },
  titulo: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    color: CORES.primary,
    marginBottom: 12,
  },
  secao: { fontSize: 10.5, fontWeight: 700, marginTop: 10, marginBottom: 4 },
  paragrafo: { marginBottom: 6, textAlign: "justify", lineHeight: 1.45 },
  blocoAssinatura: { marginTop: 22, alignItems: "center" },
  imagemAssinatura: { width: 210, height: 70, objectFit: "contain" },
  linhaAssinatura: {
    width: 260,
    borderTopWidth: 1,
    borderTopColor: CORES.texto,
    marginTop: 2,
    paddingTop: 4,
    textAlign: "center",
  },
  legenda: { fontSize: 8.5, color: CORES.mutedTexto, textAlign: "center" },
  certificadoTitulo: { fontSize: 13, fontWeight: 700, color: CORES.primary, marginBottom: 4 },
  certificadoTexto: { fontSize: 9, color: CORES.mutedTexto, marginBottom: 12, lineHeight: 1.45 },
  linha: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
    paddingVertical: 5,
  },
  linhaLabel: { width: "32%", fontWeight: 700, fontSize: 9 },
  linhaValor: { width: "68%", fontSize: 9, lineHeight: 1.45 },
  rodape: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 7.5,
    color: CORES.mutedTexto,
  },
});

// `lineHeight` fica nos estilos de texto: herdado da página, some o rodapé com `render` do react-pdf.
/** Sem hifenização: o padrão do react-pdf usa regras do inglês e quebra errado em português. */
const semHifenizar = (palavra: string) => [palavra];

export type ContratoPdfProps = {
  numero: string;
  blocos: BlocoContrato[];
  assinatura: Buffer;
  assinanteNome: string;
  assinanteCpf: string;
  assinadoEm: string;
  ip: string;
  userAgent: string;
  conteudoHash: string;
};

export function ContratoPdfDocument({
  numero,
  blocos,
  assinatura,
  assinanteNome,
  assinanteCpf,
  assinadoEm,
  ip,
  userAgent,
  conteudoHash,
}: ContratoPdfProps) {
  const logo = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

  const rodape = (
    <Text
      style={styles.rodape}
      fixed
      render={({ pageNumber, totalPages }) =>
        `Contrato ${numero} · Página ${pageNumber} de ${totalPages}`
      }
    />
  );

  const evidencias = [
    { label: "Contrato", valor: numero },
    { label: "Assinante", valor: assinanteNome },
    { label: "CPF confirmado", valor: assinanteCpf },
    { label: "Data e hora (Brasília)", valor: assinadoEm },
    { label: "Endereço IP", valor: ip },
    { label: "Navegador", valor: userAgent },
    { label: "Hash SHA-256 do texto", valor: conteudoHash },
  ];

  return (
    <Document title={`Contrato ${numero}`} author="FisioTrainer">
      <Page size="A4" style={styles.page} wrap>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
        <Image src={{ data: logo, format: "png" }} style={styles.logo} />

        {blocos.map((bloco, i) => {
          const estilo =
            bloco.tipo === "titulo"
              ? styles.titulo
              : bloco.tipo === "secao"
                ? styles.secao
                : styles.paragrafo;
          return (
            <Text
              key={i}
              style={estilo}
              hyphenationCallback={semHifenizar}
              minPresenceAhead={bloco.tipo === "secao" ? 40 : undefined}
            >
              {bloco.texto}
            </Text>
          );
        })}

        <View style={styles.blocoAssinatura} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={{ data: assinatura, format: "png" }} style={styles.imagemAssinatura} />
          <Text style={styles.linhaAssinatura}>{assinanteNome}</Text>
          <Text style={styles.legenda}>
            CONTRATANTE · CPF {assinanteCpf} · Assinado eletronicamente em {assinadoEm}
          </Text>
        </View>
        {rodape}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.certificadoTitulo}>Registro da assinatura eletrônica</Text>
        <Text style={styles.certificadoTexto}>
          O assinante confirmou o próprio CPF, leu o contrato, declarou concordar com seus
          termos e desenhou a assinatura na página de assinatura enviada pela clínica.
        </Text>
        {evidencias.map((linha) => (
          <View key={linha.label} style={styles.linha} wrap={false}>
            <Text style={styles.linhaLabel}>{linha.label}</Text>
            <Text style={styles.linhaValor} hyphenationCallback={semHifenizar}>
              {linha.valor}
            </Text>
          </View>
        ))}
        {rodape}
      </Page>
    </Document>
  );
}
