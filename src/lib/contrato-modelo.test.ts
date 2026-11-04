import { describe, expect, it } from "vitest";
import {
  CONTRATO_MODELO_PADRAO,
  VARIAVEIS_EXEMPLO,
  blocosContrato,
  renderizarModelo,
  variaveisDesconhecidas,
} from "./contrato-modelo";

describe("renderizarModelo", () => {
  it("substitui variáveis, tolerando espaços", () => {
    expect(renderizarModelo("Olá {{ a.b }} e {{a.b}}", { "a.b": "X" })).toBe("Olá X e X");
  });

  it("mantém variável sem valor", () => {
    expect(renderizarModelo("{{x.y}}", {})).toBe("{{x.y}}");
  });

  it("não reprocessa variável vinda de um valor", () => {
    const r = renderizarModelo("{{paciente.nome}}", {
      "paciente.nome": "{{paciente.cpf}}",
      "paciente.cpf": "123",
    });
    expect(r).toBe("{{paciente.cpf}}");
  });

  it("não resolve propriedades herdadas de Object", () => {
    expect(renderizarModelo("{{constructor}}", {})).toBe("{{constructor}}");
  });

  it("normaliza CRLF, para o hash não depender do sistema de quem salvou", () => {
    expect(renderizarModelo("a\r\nb", {})).toBe("a\nb");
  });
});

describe("variaveisDesconhecidas", () => {
  it("aponta só as que não estão no catálogo, sem repetir", () => {
    expect(
      variaveisDesconhecidas("{{paciente.nome}} {{paciente.nomee}} {{paciente.nomee}}"),
    ).toEqual(["paciente.nomee"]);
  });

  it("o modelo sugerido só usa variáveis do catálogo e fica todo preenchido", () => {
    expect(variaveisDesconhecidas(CONTRATO_MODELO_PADRAO)).toEqual([]);
    expect(renderizarModelo(CONTRATO_MODELO_PADRAO, VARIAVEIS_EXEMPLO)).not.toContain("{{");
  });
});

describe("blocosContrato", () => {
  it("separa título, seção e parágrafos", () => {
    expect(blocosContrato("# T\n\n## S\ntexto 1\nlinha 2\n\n\ntexto 2\n")).toEqual([
      { tipo: "titulo", texto: "T" },
      { tipo: "secao", texto: "S" },
      { tipo: "paragrafo", texto: "texto 1\nlinha 2" },
      { tipo: "paragrafo", texto: "texto 2" },
    ]);
  });

  it("texto vazio não gera blocos", () => {
    expect(blocosContrato("  \n\n")).toEqual([]);
  });

  it("# sem espaço é parágrafo", () => {
    expect(blocosContrato("#1 item")).toEqual([{ tipo: "paragrafo", texto: "#1 item" }]);
  });
});
