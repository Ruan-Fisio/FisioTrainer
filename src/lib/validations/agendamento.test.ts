import { describe, expect, it } from "vitest";
import { combinarDataHora } from "./agendamento";

describe("combinarDataHora", () => {
  it("interpreta a hora como horário de Brasília (UTC-3), independente do fuso do processo", () => {
    const d = combinarDataHora("2026-09-03", "13:10");
    // 13:10 em Brasília = 16:10 UTC
    expect(d.toISOString()).toBe("2026-09-03T16:10:00.000Z");
  });

  it("meia-noite de Brasília cai às 03:00 UTC do mesmo dia", () => {
    expect(combinarDataHora("2026-01-01", "00:00").toISOString()).toBe(
      "2026-01-01T03:00:00.000Z",
    );
  });

  it("é estável para o mesmo par data/hora", () => {
    expect(combinarDataHora("2026-06-15", "08:00").getTime()).toBe(
      combinarDataHora("2026-06-15", "08:00").getTime(),
    );
  });
});
