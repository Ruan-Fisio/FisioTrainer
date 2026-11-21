# src/lib/pdf

## Overview

`@react-pdf/renderer` document components and font registration used to generate downloadable A4 PDF files across FisioTrainer: comparative clinical reports, quick exam comparison charts, billing/NF-e receipts, signed contracts with electronic signature certificates, and clinical evolution sheets.

## Interface

- `[fonts.ts:FONTE_ASSINATURA]` — Constant string `"GreatVibes"` identifying the signature font family registered globally with `@react-pdf/renderer`.
- `[comparacao-rapida-documento.tsx:ProfissionalInfo]` — Type `{ nome: string; cref?: string | null; crefito?: string | null } | null` for professional stamp metadata.
- `[comparacao-rapida-documento.tsx:ComparacaoRapidaPdfProps]` — Props type `{ pacienteNome: string; exameNome: string; execucoes: { id: string; label: string }[]; secoes: SecaoComparacaoRapida[]; series: SerieNumerica[]; profissional?: ProfissionalInfo; geradoEm: string }` (imports `SecaoComparacaoRapida` and `SerieNumerica` from `@/lib/comparacao-rapida`).
- `[comparacao-rapida-documento.tsx:ComparacaoRapidaPdfDocument]` — React PDF `<Document>` component rendering quick multi-execution exam comparison tables, SVG evolution line charts, variation summaries, and an optional professional stamp.
- `[comprovante-documento.tsx:LinhaInfo]` — Type `{ label: string; valor: string }` for key-value receipt rows.
- `[comprovante-documento.tsx:ParcelaComprovante]` — Type `{ numero: number; vencimento: string; valor: string; status: string }` for installment rows.
- `[comprovante-documento.tsx:ComprovantePdfProps]` — Props type `{ numero: string; geradoEm: string; prestador: LinhaInfo[]; tomador: LinhaInfo[]; servico: LinhaInfo[]; valores: LinhaInfo[]; parcelas: ParcelaComprovante[] }`.
- `[comprovante-documento.tsx:ComprovantePdfDocument]` — React PDF `<Document>` component rendering provider, client, service, financial values, and optional installment tables for billing/NF-e receipts.
- `[contrato-documento.tsx:ContratoPdfProps]` — Props type `{ numero: string; blocos: BlocoContrato[]; assinatura: Buffer; assinanteNome: string; assinanteCpf: string; assinadoEm: string; ip: string; userAgent: string; conteudoHash: string }` (imports `BlocoContrato` from `@/lib/contrato-modelo`).
- `[contrato-documento.tsx:ContratoPdfDocument]` — React PDF `<Document>` component rendering structured contract blocks followed by a dedicated A4 page containing the signature image and electronic signature audit certificate.
- `[evolucao-documento.tsx:ProfissionalInfo]` — Type `{ nome: string; cref?: string | null; crefito?: string | null } | null` for professional stamp metadata.
- `[evolucao-documento.tsx:EvolucaoPdfProps]` — Props type `{ pacienteNome: string; dataFormatada: string; hdp: string; hda: string; pa: string; fc: string; spo2: string; fr: string; temperatura: string; auscultaPulmonar: string | null; evolucao: string; conduta: string; profissional: ProfissionalInfo; geradoEm: string }`.
- `[evolucao-documento.tsx:EvolucaoPdfDocument]` — React PDF `<Document>` component rendering a patient's clinical evolution sheet (HDP, HDA, vital signs, optional lung auscultation, evolution, conduct, and professional stamp).
- `[relatorio-documento.tsx:ProfissionalInfo]` — Type `{ nome: string; cref?: string | null; crefito?: string | null } | null` for professional stamp metadata.
- `[relatorio-documento.tsx:RelatorioPdfProps]` — Props type `{ titulo: string; pacienteNome: string; dadosPaciente: LinhaInfo[]; historico: LinhaInfo[]; sessao: LinhaInfo[]; secoes: SecaoComparativo[]; graficos: GraficoSecao[]; temLinhaComIdeal: boolean; geradoEm: string; profissional?: ProfissionalInfo; historicoClinico?: string | null }` (imports `LinhaInfo`, `SecaoComparativo`, and `GraficoSecao` from `@/lib/relatorio-comparativo`).
- `[relatorio-documento.tsx:RelatorioPdfDocument]` — React PDF `<Document>` component rendering a comparative clinical report with info cards, optional clinical history banner, section tables, ideal-distance badges, comparative bar charts, and professional stamp.

## Invariants

- `[fonts.ts:Font.register]` — Requires `public/fonts/GreatVibes-Regular.ttf` to exist relative to `process.cwd()`.
- `[comparacao-rapida-documento.tsx:ComparacaoRapidaPdfDocument]`, `[comprovante-documento.tsx:ComprovantePdfDocument]`, `[contrato-documento.tsx:ContratoPdfDocument]`, `[evolucao-documento.tsx:EvolucaoPdfDocument]`, `[relatorio-documento.tsx:RelatorioPdfDocument]` — All five document components require `public/logo.png` relative to `process.cwd()` to exist and be readable as a PNG at render time (no fallback or error catch around `fs.readFileSync`).
- `[comparacao-rapida-documento.tsx:SecaoTabelaRapida]` — Computes execution column widths as `(100 - 32) / execucoes.length`, requiring `execucoes` to be non-empty whenever sections are rendered.
- `[comparacao-rapida-documento.tsx:valorTextoPdf]` — Empty/undefined values, empty `GONIOMETRIA` parses (via `parseGoniometriaValor`), and empty multi-select `MULTIPLA_ESCOLHA` parses (via `parseSelecionadas`) render as `"—"`.
- `[comparacao-rapida-documento.tsx:GraficoLinha]` — Returns `null` if all series points are `null`; guards flat series against division by zero via `amplitude = max - min || 1`; centers single-point series (`n === 1`); splits SVG polyline/area paths across `null` gaps; anchors extreme X labels (`start` for first, `end` for last, `middle` otherwise) to avoid SVG clipping.
- `[comparacao-rapida-documento.tsx:PainelVariacao]` — Renders `"Sem dados suficientes"` when `resumirSerie(serie.pontos)` is falsy; maps `direcao === "queda"` to `"Redução no período"`, `"estavel"` to `"Sem variação"`, and remaining directions to `"Evolução no período"`.
- `[comprovante-documento.tsx:ComprovantePdfDocument]` & `[comprovante-documento.tsx:InfoCard]` — Omits the `Parcelas` section when `parcelas.length === 0`; `InfoCard` returns `null` when `linhas.length === 0` and keys rows by `linha.label`.
- `[contrato-documento.tsx:ContratoPdfDocument]` — Expects `assinatura` as a PNG `Buffer`; sets `minPresenceAhead={40}` on `bloco.tipo === "secao"` headings; places the signature audit certificate on a separate A4 `<Page>`.
- `[contrato-documento.tsx:styles]` — `lineHeight` must remain on individual text styles rather than `styles.page` because inheriting `lineHeight` from `<Page>` breaks `@react-pdf/renderer` fixed footers using the `render` prop.
- `[contrato-documento.tsx:semHifenizar]` — Disables `@react-pdf/renderer`'s default English hyphenation callback by returning `[palavra]` for Portuguese text and audit values.
- `[evolucao-documento.tsx:EvolucaoPdfDocument]` — Renders the `Ausculta Pulmonar` card only when `auscultaPulmonar` is truthy and falls back to `"—"` for empty vital signs or field values.
- `[relatorio-documento.tsx:RelatorioPdfDocument]` — Renders `historicoClinico` only when truthy, empty-state text when `secoes.length === 0`, ideal-classification legend only when `temLinhaComIdeal` is true, and charts only when `graficos.length > 0` (keeping the charts heading grouped with `graficos[0]` via `wrap={false}`).
- `[relatorio-documento.tsx:InfoCard]` — Returns `null` when `linhas.length === 0`, prevents page splits inside cards (`wrap={false}`), and keys rows by `linha.label`.
- `[relatorio-documento.tsx:SecaoTabela]` — Switches between a 7-column layout (`Campo`, `Ideal`, `Avaliação`, `Dist.`, `Retorno`, `Dist.`, `Progr.`) when `secao.linhas.some((linha) => linha.valorIdeal !== null)` and a 3-column layout (`Campo`, `Avaliação`, `Retorno`) otherwise; renders `"—"` for `null` values and keys rows by `linha.chave`.
- `[relatorio-documento.tsx:formatarSinal]` — Rounds numeric deltas to 1 decimal place (`Math.round(valor * 10) / 10`) and prefixes positive rounded values with `"+"`.
- `[relatorio-documento.tsx:classificacaoCores]` — Maps `Classificacao` (`"proximo"`, `"moderado"`, `"distante"` from `@/lib/relatorio-comparativo`) to badge color pairs and defaults to transparent background with muted text for `null`.
- `[relatorio-documento.tsx:GraficoBarras]` — Floors `maiorValor` at `1` (`Math.max(1, ...)`) and each bar height at `1` (`Math.max((Math.abs(valor) / maiorValor) * 80, 1)`), rendering only non-null `avaliacao`/`retorno` values rounded via `Math.round` and keying items by `item.chave`.
- `[comparacao-rapida-documento.tsx:Carimbo]`, `[evolucao-documento.tsx:Carimbo]`, `[relatorio-documento.tsx:Carimbo]` — Returns `null` when `profissional` is null; joins present `CREF` and `CREFITO` credentials with `" — "` and omits the registration line when neither is set.

## Side Effects

- `[fonts.ts:Font.register]` — Module-level side effect on import: globally registers the `"GreatVibes"` font family in `@react-pdf/renderer` referencing `public/fonts/GreatVibes-Regular.ttf`.
- `[comparacao-rapida-documento.tsx:ComparacaoRapidaPdfDocument]` — Performs a synchronous filesystem read of `public/logo.png` via `fs.readFileSync` on every render.
- `[comprovante-documento.tsx:ComprovantePdfDocument]` — Performs a synchronous filesystem read of `public/logo.png` via `fs.readFileSync` on every render.
- `[contrato-documento.tsx:ContratoPdfDocument]` — Performs a synchronous filesystem read of `public/logo.png` via `fs.readFileSync` on every render.
- `[evolucao-documento.tsx:EvolucaoPdfDocument]` — Performs a synchronous filesystem read of `public/logo.png` via `fs.readFileSync` on every render.
- `[relatorio-documento.tsx:RelatorioPdfDocument]` — Performs a synchronous filesystem read of `public/logo.png` via `fs.readFileSync` on every render.

## Verification

- Run: `npm test`
