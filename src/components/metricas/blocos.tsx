import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acessosPorHora,
  acoesChave,
  planosMaisUsados,
  telasMaisAcessadas,
  usuariosAtivos,
  viewsPorDia,
} from "@/lib/metricas";
import { horaDePico, percentual } from "@/lib/metricas-montagem";
import { formatarYmd } from "@/lib/format";
import type { AreaUsoChave } from "@/lib/metricas-rota";

const AREA_TITULO: Record<AreaUsoChave, string> = {
  CLINICA: "Telas da clínica",
  PORTAL: "Portal do paciente",
  PRE_CADASTRO: "Pré-cadastro público",
};

function Vazio() {
  return <p className="py-4 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
}

function BlocoCard({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function BlocoSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

function Barra({ valor, max }: { valor: number; max: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted" aria-hidden>
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${percentual(valor, max)}%` }}
      />
    </div>
  );
}

export async function BlocoTelas({ area, dias }: { area: AreaUsoChave; dias: number }) {
  const linhas = await telasMaisAcessadas(area, dias);
  const max = linhas[0]?.total ?? 0;
  return (
    <BlocoCard titulo={AREA_TITULO[area]}>
      {linhas.length === 0 ? (
        <Vazio />
      ) : (
        <ol className="flex flex-col gap-3">
          {linhas.map((l) => (
            <li key={l.chave} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 break-all font-mono text-xs">{l.chave}</span>
                <span className="shrink-0 font-medium tabular-nums">{l.total}</span>
              </div>
              <Barra valor={l.total} max={max} />
            </li>
          ))}
        </ol>
      )}
    </BlocoCard>
  );
}

export async function BlocoSerie({ dias }: { dias: number }) {
  const serie = await viewsPorDia(dias);
  const total = serie.reduce((s, d) => s + d.total, 0);
  const max = Math.max(0, ...serie.map((d) => d.total));
  return (
    <BlocoCard titulo="Page views por dia" className="lg:col-span-2">
      {total === 0 ? (
        <Vazio />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="text-2xl font-semibold text-foreground tabular-nums">{total}</span>{" "}
            page views · pico de {max} em um dia
          </p>
          <div className="flex h-32 items-end gap-px" role="img" aria-label={`Page views por dia, total ${total}`}>
            {serie.map((d) => (
              <div
                key={d.dia}
                title={`${formatarYmd(d.dia)}: ${d.total}`}
                className="min-w-0 flex-1 rounded-t-sm bg-primary/80"
                style={{ height: `${Math.max(percentual(d.total, max), d.total > 0 ? 3 : 0)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatarYmd(serie[0].dia)}</span>
            <span>{formatarYmd(serie[serie.length - 1].dia)}</span>
          </div>
        </div>
      )}
    </BlocoCard>
  );
}

export async function BlocoUsuarios({ dias }: { dias: number }) {
  const ativos = await usuariosAtivos(dias);
  return (
    <BlocoCard titulo="Usuários ativos">
      <p className="text-3xl font-semibold tabular-nums">{ativos}</p>
      <p className="text-sm text-muted-foreground">usuários distintos na clínica</p>
    </BlocoCard>
  );
}

export async function BlocoHorario({ dias }: { dias: number }) {
  const horas = await acessosPorHora(dias);
  const pico = horaDePico(horas);
  const max = Math.max(0, ...horas);
  return (
    <BlocoCard titulo="Horário de pico" className="lg:col-span-2">
      {pico === null ? (
        <Vazio />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Maior movimento às{" "}
            <span className="font-semibold text-foreground">{String(pico).padStart(2, "0")}h</span>{" "}
            (horário de Brasília)
          </p>
          <div className="flex h-24 items-end gap-px" role="img" aria-label="Page views por hora do dia">
            {horas.map((total, h) => (
              <div
                key={h}
                title={`${String(h).padStart(2, "0")}h: ${total}`}
                className="min-w-0 flex-1 rounded-t-sm bg-primary/80"
                style={{ height: `${Math.max(percentual(total, max), total > 0 ? 3 : 0)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>00h</span>
            <span>12h</span>
            <span>23h</span>
          </div>
        </div>
      )}
    </BlocoCard>
  );
}

export async function BlocoAcoes({ dias }: { dias: number }) {
  const { logins, modulos } = await acoesChave(dias);
  return (
    <BlocoCard titulo="Ações-chave" className="lg:col-span-2">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{logins}</span> logins
        </p>
        {modulos.length === 0 ? (
          <Vazio />
        ) : (
          <>
            {/* mobile: cards; desktop: tabela */}
            <ul className="flex flex-col gap-2 md:hidden">
              {modulos.map((m) => (
                <li key={m.modulo} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{m.rotulo}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {m.criacoes} criações · {m.alteracoes} alterações
                  </span>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-medium">Módulo</th>
                  <th className="py-1 text-right font-medium">Criações</th>
                  <th className="py-1 text-right font-medium">Alterações</th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m.modulo} className="border-t">
                    <td className="py-1.5">{m.rotulo}</td>
                    <td className="py-1.5 text-right tabular-nums">{m.criacoes}</td>
                    <td className="py-1.5 text-right tabular-nums">{m.alteracoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </BlocoCard>
  );
}

export async function BlocoPlanos({ dias }: { dias: number }) {
  const planos = await planosMaisUsados(dias);
  return (
    <BlocoCard titulo="Planos mais usados" className="lg:col-span-2">
      {planos.length === 0 ? (
        <Vazio />
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {planos.map((p) => (
              <li key={p.planoNome} className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">{p.planoNome}</span>
                <span className="text-muted-foreground tabular-nums">
                  {p.atribuicoes} atribuições · {p.ativas} ativas · {p.atendimentos} atendimentos
                </span>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">Plano</th>
                <th className="py-1 text-right font-medium">Atribuições no período</th>
                <th className="py-1 text-right font-medium">Ativas hoje</th>
                <th className="py-1 text-right font-medium">Atendimentos no período</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.planoNome} className="border-t">
                  <td className="py-1.5">{p.planoNome}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.atribuicoes}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.ativas}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.atendimentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </BlocoCard>
  );
}
