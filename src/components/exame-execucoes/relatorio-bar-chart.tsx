type ItemGrafico = {
  chave: string;
  rotulo: string;
  avaliacao: number | null;
  retorno: number | null;
};

const ALTURA = 170;
const LARGURA_GRUPO = 92;
const LARGURA_BARRA = 26;
const MARGEM_ESQUERDA = 50;
const MARGEM_TOPO = 24;
const MARGEM_BASE = 80;

function formatarValor(valor: number) {
  const arredondado = Math.round(valor * 10) / 10;
  return Number.isInteger(arredondado) ? `${arredondado}` : arredondado.toFixed(1);
}

export function RelatorioBarChart({
  titulo,
  itens,
  sufixo,
}: {
  titulo: string;
  itens: ItemGrafico[];
  sufixo?: string;
}) {
  if (itens.length === 0) return null;

  const maiorValor = Math.max(
    1,
    ...itens.flatMap((item) => [item.avaliacao ?? 0, item.retorno ?? 0]),
  );
  const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BASE;
  const largura = MARGEM_ESQUERDA * 2 + itens.length * LARGURA_GRUPO;

  function alturaBarra(valor: number | null) {
    if (valor === null) return 0;
    return (Math.abs(valor) / maiorValor) * alturaUtil;
  }

  return (
    <div className="break-inside-avoid rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-primary">{titulo}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-primary" />
            Avaliação
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-accent" />
            Retorno
          </span>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${ALTURA}`}
          width={largura}
          height={ALTURA}
          style={{ fontFamily: "inherit" }}
          className="text-foreground"
        >
          <line
            x1={0}
            y1={ALTURA - MARGEM_BASE}
            x2={largura}
            y2={ALTURA - MARGEM_BASE}
            className="stroke-border"
            strokeWidth={1}
          />
          {itens.map((item, index) => {
            const grupoX = MARGEM_ESQUERDA + index * LARGURA_GRUPO;
            const alturaAval = alturaBarra(item.avaliacao);
            const alturaRet = alturaBarra(item.retorno);
            const baseY = ALTURA - MARGEM_BASE;
            const xAval = grupoX + 6;
            const xRet = xAval + LARGURA_BARRA + 4;

            return (
              <g key={item.chave}>
                {item.avaliacao !== null && (
                  <>
                    <rect
                      x={xAval}
                      y={baseY - alturaAval}
                      width={LARGURA_BARRA}
                      height={Math.max(alturaAval, 1)}
                      rx={2}
                      fill="var(--primary)"
                    />
                    <text
                      x={xAval + LARGURA_BARRA / 2}
                      y={baseY - alturaAval - 6}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      className="fill-primary"
                    >
                      {formatarValor(item.avaliacao)}
                      {sufixo}
                    </text>
                  </>
                )}
                {item.retorno !== null && (
                  <>
                    <rect
                      x={xRet}
                      y={baseY - alturaRet}
                      width={LARGURA_BARRA}
                      height={Math.max(alturaRet, 1)}
                      rx={2}
                      fill="var(--accent)"
                    />
                    <text
                      x={xRet + LARGURA_BARRA / 2}
                      y={baseY - alturaRet - 6}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      className="fill-accent-foreground"
                      fill="#b06f06"
                    >
                      {formatarValor(item.retorno)}
                      {sufixo}
                    </text>
                  </>
                )}
                <text
                  x={grupoX + LARGURA_GRUPO / 2 - 4}
                  y={baseY + 14}
                  textAnchor="end"
                  fontSize={10}
                  className="fill-muted-foreground"
                  transform={`rotate(-35 ${grupoX + LARGURA_GRUPO / 2 - 4} ${baseY + 14})`}
                >
                  {item.rotulo.length > 18
                    ? `${item.rotulo.slice(0, 17)}…`
                    : item.rotulo}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
