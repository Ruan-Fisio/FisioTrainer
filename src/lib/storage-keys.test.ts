import { describe, expect, it } from "vitest";
import {
  chaveDoPaciente,
  chaveTmpDoPaciente,
  ehImagem,
  extensaoDoNome,
  extensaoSegura,
  mimeEfetivo,
  montarChaveImagem,
  chaveTmpPreCadastroValida,
  montarChaveAnexoPaciente,
  montarChaveArquivoPreCadastro,
  montarChaveTmp,
  montarChaveTmpPreCadastro,
  sessaoUploadValida,
  tipoPreview,
  montarRemapLinhas,
  TAMANHO_MAXIMO_ARQUIVO,
  validarArquivo,
} from "./storage-keys";

describe("montarChaveImagem", () => {
  it("monta a chave sob o prefixo do paciente com a extensão do nome", () => {
    const chave = montarChaveImagem({
      pacienteId: "p1",
      execucaoId: "e1",
      colunaId: "k1",
      linha: 2,
      uuid: "abc",
      nome: "Exame Final.PDF",
    });
    expect(chave).toBe("pacientes/p1/execucoes/e1/k1/2/abc.pdf");
  });

  it("usa bin quando a extensão é ausente ou estranha", () => {
    expect(extensaoSegura("semextensao")).toBe("bin");
    expect(extensaoSegura("a.tar/../x")).toBe("bin");
    expect(extensaoSegura("a.muitolongaextensao")).toBe("bin");
  });
});

describe("validarArquivo", () => {
  it("aceita qualquer tipo não executável", () => {
    for (const nome of ["foto.jpg", "laudo.pdf", "video.mp4", "dados.csv", "scan.dcm", "semext"]) {
      expect(validarArquivo(nome, 1000)).toBeNull();
    }
  });
  it("recusa executáveis e scripts, em qualquer caixa e com disfarces", () => {
    for (const nome of ["a.exe", "A.EXE", "run.sh", "x.bat", "m.msi", "p.ps1", "j.js", "a.exe.", "a.exe ", "pag.html", "i.svg"]) {
      expect(validarArquivo(nome, 1000), nome).not.toBeNull();
    }
  });
  it("recusa vazio, grande demais e sem nome", () => {
    expect(validarArquivo("a.png", 0)).not.toBeNull();
    expect(validarArquivo("a.png", TAMANHO_MAXIMO_ARQUIVO + 1)).not.toBeNull();
    expect(validarArquivo("  ", 10)).not.toBeNull();
  });
});

describe("ehImagem / mimeEfetivo / extensaoDoNome", () => {
  it("só raster vira imagem inline", () => {
    expect(ehImagem("image/png")).toBe(true);
    expect(ehImagem("image/svg+xml")).toBe(false);
    expect(ehImagem("application/pdf")).toBe(false);
  });
  it("mime vazio ou malformado vira genérico", () => {
    expect(mimeEfetivo("")).toBe("application/octet-stream");
    expect(mimeEfetivo("lixo")).toBe("application/octet-stream");
    expect(mimeEfetivo("application/pdf")).toBe("application/pdf");
  });
  it("extração de extensão", () => {
    expect(extensaoDoNome("a.b.PNG")).toBe("png");
    expect(extensaoDoNome("sem")).toBe("");
  });
});

describe("chaveDoPaciente", () => {
  it("só aceita chaves do próprio paciente", () => {
    expect(chaveDoPaciente("pacientes/p1/x.png", "p1")).toBe(true);
    expect(chaveDoPaciente("pacientes/p2/x.png", "p1")).toBe(false);
    expect(chaveDoPaciente("pacientes/p1/../p2/x.png", "p1")).toBe(false);
    expect(chaveDoPaciente("pacientes/p10/x.png", "p1")).toBe(false);
  });
});

describe("montarChaveAnexoPaciente", () => {
  it("fica sob o prefixo do paciente", () => {
    const chave = montarChaveAnexoPaciente({ pacienteId: "p1", uuid: "u", nome: "Laudo.PDF" });
    expect(chave).toBe("pacientes/p1/anexos/u.pdf");
    expect(chaveDoPaciente(chave, "p1")).toBe(true);
    expect(chaveDoPaciente(chave, "p2")).toBe(false);
  });
});

describe("tipoPreview", () => {
  it("só libera o que o navegador renderiza sem executar o arquivo", () => {
    expect(tipoPreview("image/jpeg")).toBe("imagem");
    expect(tipoPreview("application/pdf")).toBe("pdf");
    expect(tipoPreview("video/mp4")).toBe("video");
    expect(tipoPreview("audio/mpeg")).toBe("audio");
    expect(tipoPreview("image/svg+xml")).toBeNull();
    expect(tipoPreview("text/html")).toBeNull();
    expect(tipoPreview("application/zip")).toBeNull();
  });
});

describe("pré-cadastro", () => {
  const sessao = "0b8f2c1e-1c4d-4a53-9f3e-2b7a6c9d8e10";
  it("valida o id de sessão (uuid)", () => {
    expect(sessaoUploadValida(sessao)).toBe(true);
    expect(sessaoUploadValida("../x")).toBe(false);
    expect(sessaoUploadValida("abc")).toBe(false);
  });
  it("chave tmp só vale na pasta da própria sessão", () => {
    const chave = montarChaveTmpPreCadastro({ sessaoId: sessao, uuid: "u1", nome: "Laudo.PDF" });
    expect(chave).toBe(`tmp/pre-cadastro/${sessao}/u1.pdf`);
    expect(chaveTmpPreCadastroValida(chave, sessao)).toBe(true);
    expect(chaveTmpPreCadastroValida(chave, "0b8f2c1e-1c4d-4a53-9f3e-2b7a6c9d8e11")).toBe(false);
    expect(chaveTmpPreCadastroValida(`tmp/pre-cadastro/${sessao}/../x.pdf`, sessao)).toBe(false);
    expect(chaveTmpPreCadastroValida("pacientes/p1/x.pdf", sessao)).toBe(false);
  });
  it("chave definitiva fica sob pre-cadastro/{id}/", () => {
    expect(montarChaveArquivoPreCadastro({ preCadastroId: "pc1", uuid: "u", nome: "a.jpg" })).toBe(
      "pre-cadastro/pc1/u.jpg",
    );
  });
});

describe("montarRemapLinhas", () => {
  it("mapeia linhas salvas para a nova posição e ignora linhas novas", () => {
    const remap = montarRemapLinhas({
      k1: ["linha-0", "linha-2", "xyz123"],
      k3: ["0", "novo"],
      k2: ["linha-1"],
    });
    expect(remap).toEqual([
      { colunaId: "k1", de: 0, para: 0 },
      { colunaId: "k3", de: 0, para: 0 },
      { colunaId: "k2", de: 1, para: 0 },
      { colunaId: "k1", de: 2, para: 1 },
    ]);
  });
});

describe("chave temporária", () => {
  it("monta sob tmp/ e só aceita o próprio paciente", () => {
    const chave = montarChaveTmp({ pacienteId: "p1", uuid: "u1", nome: "foto.webp" });
    expect(chave).toBe("tmp/pacientes/p1/u1.webp");
    expect(chaveTmpDoPaciente(chave, "p1")).toBe(true);
    expect(chaveTmpDoPaciente(chave, "p2")).toBe(false);
    expect(chaveTmpDoPaciente("tmp/pacientes/p1/../p2/u.png", "p1")).toBe(false);
    expect(chaveTmpDoPaciente("pacientes/p1/u.png", "p1")).toBe(false);
  });
  it("usa bin para nome sem extensão", () => {
    expect(
      montarChaveTmp({ pacienteId: "p1", uuid: "u", nome: "arquivo" }),
    ).toBe("tmp/pacientes/p1/u.bin");
  });
});
