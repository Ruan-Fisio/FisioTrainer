import { describe, expect, it } from "vitest";
import { tipoDocumento } from "@/lib/documentos-catalogo";
import {
  extrairLembrados,
  lerValoresDoFormData,
  nomeArquivoDocumento,
  paraWinAnsi,
  validarValoresDocumento,
  valoresIniciais,
} from "@/lib/documentos-valores";

const atestado = tipoDocumento("atestado-fisioterapeutico")!;
const encaminhamento = tipoDocumento("encaminhamento-multiprofissional")!;
const declaracao = tipoDocumento("declaracao-comparecimento")!;

describe("valoresIniciais", () => {
  const paciente = {
    nome: "Maria Souza",
    // data pura: meia-noite UTC — não pode virar o dia anterior no fuso de Brasília
    dataNascimento: new Date(Date.UTC(1990, 2, 5)),
    cpf: "123.456.789-00",
  };

  it("preenche paciente e data de hoje em Brasília", () => {
    // 16/11/2026 01:30 UTC = 15/11/2026 22:30 em Brasília
    const agora = new Date(Date.UTC(2026, 10, 16, 1, 30));
    const v = valoresIniciais(atestado, paciente, {}, agora);
    expect(v.paciente_nome).toBe("Maria Souza");
    expect(v.paciente_nascimento).toBe("1990-03-05");
    expect(v.paciente_documento).toBe("CPF 123.456.789-00");
    expect(v.data_avaliacao).toBe("2026-11-15");
    expect(v.data_emissao).toBe("2026-11-15");
    expect(v.conclusao_funcional).toBeUndefined();
  });

  it("usa os dados do profissional lembrados e omite o que o paciente não tem", () => {
    const v = valoresIniciais(
      atestado,
      { nome: "Ana", dataNascimento: null, cpf: null },
      { local: "Vitória/ES", contato: "(27) 99999-0000", endereco: "Rua A, 1" },
    );
    expect(v.local_emissao).toBe("Vitória/ES");
    expect(v.contato_profissional).toBe("(27) 99999-0000");
    expect(v.endereco_profissional).toBe("Rua A, 1");
    expect(v).not.toHaveProperty("paciente_nascimento");
    expect(v).not.toHaveProperty("paciente_documento");
  });

  it("trunca o lembrado ao limite do campo", () => {
    const v = valoresIniciais(encaminhamento, paciente, { contato: "x".repeat(200) });
    expect(String(v.contato_retorno)).toHaveLength(65);
  });
});

describe("extrairLembrados", () => {
  it("pega o valor mais recente de cada chave, de qualquer tipo", () => {
    const l = extrairLembrados([
      { tipo: encaminhamento, valores: { contato_retorno: "novo contato" } },
      { tipo: undefined, valores: { qualquer: "x" } },
      { tipo: atestado, valores: { contato_profissional: "antigo", local_emissao: "Vila Velha", endereco_profissional: " " } },
    ]);
    expect(l).toEqual({ contato: "novo contato", local: "Vila Velha" });
  });
});

describe("lerValoresDoFormData + validarValoresDocumento", () => {
  it("lê checkboxes, remove vazios e valida", () => {
    const fd = new FormData();
    fd.set("paciente_nome", "  José  ");
    fd.set("indicacao_afastamento", "on");
    fd.set("paciente_nascimento", "2000-02-29");
    fd.set("campo_estranho", "ignorado");
    const r = validarValoresDocumento(atestado, lerValoresDoFormData(atestado, fd));
    expect(r).toEqual({
      ok: true,
      valores: { paciente_nome: "José", indicacao_afastamento: true, paciente_nascimento: "2000-02-29" },
    });
  });

  it("rejeita campo desconhecido, data impossível, hora inválida e texto acima do limite", () => {
    expect(validarValoresDocumento(atestado, { invasor: "x" }).ok).toBe(false);
    expect(validarValoresDocumento(atestado, { paciente_nascimento: "2001-02-29" }).ok).toBe(false);
    expect(validarValoresDocumento(declaracao, { comparecimento_entrada: "25:00" }).ok).toBe(false);
    expect(validarValoresDocumento(declaracao, { comparecimento_entrada: "07:45" }).ok).toBe(true);
    const r = validarValoresDocumento(atestado, { paciente_documento: "x".repeat(31) });
    expect(r).toEqual({ ok: false, erro: "Documento (se necessário): no máximo 30 caracteres." });
    expect(validarValoresDocumento(atestado, { indicacao_outra: "sim" }).ok).toBe(false);
  });
});

describe("nomeArquivoDocumento", () => {
  it("gera nome ASCII sem acentos nem barras", () => {
    expect(nomeArquivoDocumento("Solicitação de continuidade / prorrogação", "José D'Ávila")).toBe(
      "Solicitacao_de_continuidade_prorrogacao_Jose_D_Avila.pdf",
    );
  });
});

describe("paraWinAnsi", () => {
  it("mantém acentos e pontuação tipográfica, descarta emoji", () => {
    expect(paraWinAnsi("Ação – “ok” ç ° 💪\r\nfim\t!")).toBe("Ação – “ok” ç ° \nfim !");
  });
  it("tira acento de letras fora do Latin-1", () => {
    // ó é Latin-1 (fica); ź/ő viram z/o; Ł não decompõe e some.
    expect(paraWinAnsi("Łódź ő")).toBe("ódz o");
  });
});
