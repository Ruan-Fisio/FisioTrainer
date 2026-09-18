import { describe, expect, it } from "vitest";
import { planoAtribuicaoSchema } from "./plano-atribuicao";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    planoId: "plano-1",
    formaPagamento: "A_VISTA",
    periodicidade: "MENSAL",
    vencimentos: ["2026-09-01"],
    ...overrides,
  };
}

describe("planoAtribuicaoSchema", () => {
  it("aceita um input válido e converte vencimentos em Date", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.vencimentos).toHaveLength(1);
      expect(parsed.data.vencimentos[0]).toBeInstanceOf(Date);
      expect(parsed.data.formaPagamento).toBe("A_VISTA");
    }
  });

  it("exige planoId", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ planoId: "" }));
    expect(parsed.success).toBe(false);
  });

  it("exige formaPagamento válido", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ formaPagamento: "OUTRA" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("exige ao menos uma data de vencimento", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ vencimentos: [] }));
    expect(parsed.success).toBe(false);
  });

  // O teto exato de parcelas por plano (mensal nunca parcela / trimestral até 3x,
  // ou até 2x/6x com `Plano.permiteParcelamentoEstendido`) não é mais responsabilidade
  // deste schema — ele só recebe `planoId` (string), sem o registro `Plano` pra saber
  // se o flag está ligado. Esse teto exato é checado na server action
  // (`createPlanoAtribuicao`/`updatePlanoAtribuicao` em `src/actions/plano-atribuicoes.ts`),
  // depois que o `Plano` é buscado no banco — ver `maxParcelasPlano` em `planos.test.ts`.
  // Aqui o schema só garante um teto genérico (o maior valor possível em todo o sistema).
  it("aceita até o teto genérico (6 parcelas) independente de periodicidade/forma", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({
        periodicidade: "TRIMESTRAL",
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: [
          "2026-09-01",
          "2026-10-01",
          "2026-11-01",
          "2026-12-01",
          "2027-01-01",
          "2027-02-01",
        ],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejeita mais de 6 parcelas (teto genérico)", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({
        periodicidade: "TRIMESTRAL",
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: [
          "2026-09-01",
          "2026-10-01",
          "2026-11-01",
          "2026-12-01",
          "2027-01-01",
          "2027-02-01",
          "2027-03-01",
        ],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita sem desconto por padrão", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.descontoTipo).toBe("NENHUM");
      expect(parsed.data.descontoValor).toBe(0);
    }
  });

  it("exige descontoValor quando descontoTipo é VALOR", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "VALOR", descontoValor: "" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita descontoValor válido para VALOR", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "VALOR", descontoValor: "50" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.descontoValor).toBe(50);
  });

  it("rejeita percentual maior que 100", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "PERCENTUAL", descontoValor: "150" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("exige valorAlvoParcela quando descontoTipo é ALVO_PARCELA", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "ALVO_PARCELA", valorAlvoParcela: "" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita valorAlvoParcela válido para ALVO_PARCELA", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "ALVO_PARCELA", valorAlvoParcela: "90" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.valorAlvoParcela).toBe(90);
  });
});
