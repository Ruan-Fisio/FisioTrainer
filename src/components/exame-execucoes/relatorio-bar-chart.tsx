type ItemGrafico = {
  chave: string;
  rotulo: string;
  avaliacao: number | null;
  retorno: number | null;
};

const ALTURA_PLOT = 150;

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

  function alturaBarra(valor: number) {
    return Math.max((Math.abs(valor) / maiorValor) * ALTURA_PLOT, 2);
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

      {/* Barras e rótulos são duas linhas flex com os mesmos `flex-1`, o que
          mantém cada rótulo alinhado à sua coluna em qualquer largura. */}
      <div className="flex w-full items-end border-b">
        {itens.map((item) => (
          <div
            key={item.chave}
            className="flex min-w-0 flex-1 items-end justify-center gap-2 px-1"
            style={{ height: ALTURA_PLOT + 20 }}
          >
            {item.avaliacao !== null && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-primary">
                  {formatarValor(item.avaliacao)}
                  {sufixo}
                </span>
                <div
                  className="w-6 rounded-t-sm bg-primary"
                  style={{ height: alturaBarra(item.avaliacao) }}
                />
              </div>
            )}
            {item.retorno !== null && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#b06f06" }}
                >
                  {formatarValor(item.retorno)}
                  {sufixo}
                </span>
                <div
                  className="w-6 rounded-t-sm bg-accent"
                  style={{ height: alturaBarra(item.retorno) }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex w-full">
        {itens.map((item) => (
          <p
            key={item.chave}
            className="min-w-0 flex-1 px-1 pt-2 text-center text-[10px] leading-tight break-words text-muted-foreground"
          >
            {item.rotulo}
          </p>
        ))}
      </div>
    </div>
  );
}
