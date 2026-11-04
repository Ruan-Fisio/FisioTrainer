import { describe, expect, it } from "vitest";
import {
  MAX_TENTATIVAS_CPF,
  MINUTOS_BLOQUEIO_CPF,
  NAO_INFORMADO,
  TAMANHO_MAXIMO_ASSINATURA,
  cpfBloqueado,
  decodificarAssinaturaPng,
  estadoAposFalhaCpf,
  formatarNumeroContrato,
  gerarTokenContrato,
  hashDadosPlano,
  ipDoAssinante,
  montarVariaveisContrato,
  pendenciasContrato,
  type DadosContrato,
} from "./contrato-regras";
import { GRUPOS_VARIAVEIS } from "./contrato-modelo";

function dados(sobrescrever: Partial<DadosContrato> = {}): DadosContrato {
  return {
    numero: 7,
    emitidoEm: new Date("2026-11-04T23:30:00-03:00"),
    paciente: {
      nome: "Maria",
      cpf: "12345678901",
      dataNascimento: new Date("1985-05-10T00:00:00Z"),
      endereco: "Rua A",
      contato: "28999990000",
      email: null,
    },
    contratada: {
      name: "Ruan",
      razaoSocial: "Clínica LTDA",
      cpfCnpj: "00.000.000/0001-00",
      inscricaoMunicipal: null,
      endereco: "Av. B",
      telefone: null,
      email: "c@x.com",
    },
    plano: {
      nome: "Plano X",
      tipos: ["FISIOTERAPIA", "EDUCACAO_FISICA"],
      atendimentos: 4,
      periodicidade: "TRIMESTRAL",
      formaPagamento: "ATE_3X_CARTAO",
      numeroParcelas: 2,
      valorOriginal: 1000,
      desconto: 100,
      valor: 900,
      dataInicio: new Date("2026-12-01T12:00:00-03:00"),
      parcelas: [
        { numero: 1, vencimento: new Date("2026-12-01T12:00:00-03:00"), valor: 450 },
        { numero: null, vencimento: new Date("2027-01-01T12:00:00-03:00"), valor: 450 },
      ],
    },
    ...sobrescrever,
  };
}

describe("montarVariaveisContrato", () => {
  it("preenche toda variável do catálogo", () => {
    const vars = montarVariaveisContrato(dados());
    const chaves = GRUPOS_VARIAVEIS.flatMap((g) => g.variaveis.map((v) => v.chave));
    expect(Object.keys(vars).sort()).toEqual([...chaves].sort());
  });

  it("formata valores, datas no fuso de Brasília e modalidades", () => {
    const vars = montarVariaveisContrato(dados());
    expect(vars["paciente.cpf"]).toBe("123.456.789-01");
    expect(vars["paciente.data_nascimento"]).toBe("10/05/1985");
    expect(vars["contrato.numero"]).toBe("CT-000007");
    // 23:30 em Brasília já é dia 5 em UTC: o dia certo é o 4.
    expect(vars["contrato.data_emissao"]).toBe("04/11/2026");
    expect(vars["plano.modalidades"]).toBe("Fisioterapia e Educação Física");
    expect(vars["plano.total_atendimentos"]).toBe("12");
    expect(vars["plano.valor_total"]).toMatch(/900,00/);
  });

  it("lista as parcelas, numerando pela posição quando falta o número", () => {
    const linhas = montarVariaveisContrato(dados())["plano.parcelas"].split("\n");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatch(/^Parcela 1: vencimento em 01\/12\/2026, .*450,00$/);
    expect(linhas[1]).toMatch(/^Parcela 2: vencimento em 01\/01\/2027/);
  });

  it("usa o nome quando não há razão social e marca o que falta", () => {
    const base = dados();
    const vars = montarVariaveisContrato(
      dados({
        contratada: { ...base.contratada!, razaoSocial: null, telefone: "  " },
        paciente: { ...base.paciente, cpf: null, dataNascimento: null },
      }),
    );
    expect(vars["contratada.nome"]).toBe("Ruan");
    expect(vars["contratada.telefone"]).toBe(NAO_INFORMADO);
    expect(vars["paciente.cpf"]).toBe(NAO_INFORMADO);
    expect(vars["paciente.data_nascimento"]).toBe(NAO_INFORMADO);
  });

  it("não mostra limite quando o plano não tem atendimentos definidos", () => {
    const base = dados();
    const vars = montarVariaveisContrato(
      dados({ plano: { ...base.plano, atendimentos: null } }),
    );
    expect(vars["plano.atendimentos_mes"]).toBe("sem limite definido");
    expect(vars["plano.total_atendimentos"]).toBe("sem limite definido");
  });

  it("não expõe os créditos de remarcação ao paciente", () => {
    const vars = montarVariaveisContrato(dados());
    expect(Object.keys(vars).some((k) => /credito|remarc/i.test(k))).toBe(false);
  });
});

describe("hashDadosPlano", () => {
  it("muda se o plano muda, mas não com dados do paciente ou com a emissão", () => {
    const base = dados();
    const original = hashDadosPlano(montarVariaveisContrato(base));

    expect(
      hashDadosPlano(
        montarVariaveisContrato(
          dados({
            numero: 99,
            emitidoEm: new Date("2027-01-01T12:00:00-03:00"),
            paciente: { ...base.paciente, endereco: "Outra rua" },
          }),
        ),
      ),
    ).toBe(original);

    expect(
      hashDadosPlano(
        montarVariaveisContrato(dados({ plano: { ...base.plano, valor: 800 } })),
      ),
    ).not.toBe(original);
  });
});

describe("pendenciasContrato", () => {
  it("sem pendências quando está tudo preenchido", () => {
    expect(pendenciasContrato(dados())).toEqual({ bloqueios: [], avisos: [] });
  });

  it("bloqueia sem CPF do paciente ou documento da clínica", () => {
    const base = dados();
    expect(
      pendenciasContrato({
        paciente: { ...base.paciente, cpf: " " },
        contratada: { ...base.contratada!, cpfCnpj: null },
      }).bloqueios,
    ).toEqual(["CPF do paciente", "CPF/CNPJ da clínica"]);
    expect(pendenciasContrato({ ...base, contratada: null }).bloqueios).toHaveLength(1);
  });

  it("endereços faltando só geram aviso", () => {
    const base = dados();
    const p = pendenciasContrato({
      paciente: { ...base.paciente, endereco: null },
      contratada: { ...base.contratada!, endereco: "" },
    });
    expect(p.bloqueios).toEqual([]);
    expect(p.avisos).toHaveLength(2);
  });
});

describe("bloqueio por CPF errado", () => {
  const agora = new Date("2026-11-04T12:00:00-03:00");

  it("só trava na última tentativa permitida, e então zera o contador", () => {
    expect(estadoAposFalhaCpf(0, agora)).toEqual({ tentativasCpf: 1, bloqueadoAte: null });
    const travado = estadoAposFalhaCpf(MAX_TENTATIVAS_CPF - 1, agora);
    expect(travado.tentativasCpf).toBe(0);
    expect(travado.bloqueadoAte?.getTime()).toBe(
      agora.getTime() + MINUTOS_BLOQUEIO_CPF * 60_000,
    );
  });

  it("libera quando o prazo passa", () => {
    const { bloqueadoAte } = estadoAposFalhaCpf(MAX_TENTATIVAS_CPF, agora);
    expect(cpfBloqueado(bloqueadoAte, agora)).toBe(true);
    expect(
      cpfBloqueado(bloqueadoAte, new Date(agora.getTime() + MINUTOS_BLOQUEIO_CPF * 60_000)),
    ).toBe(false);
    expect(cpfBloqueado(null, agora)).toBe(false);
  });
});

describe("decodificarAssinaturaPng", () => {
  const cabecalho = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = (tamanho: number) =>
    `data:image/png;base64,${Buffer.concat([cabecalho, Buffer.alloc(tamanho - 8)]).toString("base64")}`;

  it("aceita um PNG", () => {
    expect(decodificarAssinaturaPng(png(200))?.length).toBe(200);
  });

  it("recusa o que não é PNG ou passa do tamanho", () => {
    expect(decodificarAssinaturaPng(null)).toBeNull();
    expect(decodificarAssinaturaPng("data:image/svg+xml;base64,AAAA")).toBeNull();
    expect(decodificarAssinaturaPng("data:image/png;base64,###")).toBeNull();
    expect(
      decodificarAssinaturaPng(`data:image/png;base64,${Buffer.alloc(200).toString("base64")}`),
    ).toBeNull();
    expect(decodificarAssinaturaPng(png(20))).toBeNull();
    expect(decodificarAssinaturaPng(png(TAMANHO_MAXIMO_ASSINATURA + 1))).toBeNull();
  });
});

describe("demais auxiliares", () => {
  it("usa o primeiro IP da cadeia", () => {
    expect(ipDoAssinante("1.1.1.1, 2.2.2.2", "3.3.3.3")).toBe("1.1.1.1");
    expect(ipDoAssinante(null, "3.3.3.3")).toBe("3.3.3.3");
    expect(ipDoAssinante(null, null)).toBe("não identificado");
  });

  it("gera tokens longos e diferentes", () => {
    const a = gerarTokenContrato();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(a).not.toBe(gerarTokenContrato());
  });

  it("formata o número", () => {
    expect(formatarNumeroContrato(1234567)).toBe("CT-1234567");
  });
});
