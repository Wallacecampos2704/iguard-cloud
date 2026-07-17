import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateTime,
  getDurationMilliseconds,
  IGUARD_TIME_ZONE,
  toTimestamp,
} from "./date-time.ts";

test("converte UTC para America/Sao_Paulo no formato padrão", () => {
  assert.equal(IGUARD_TIME_ZONE, "America/Sao_Paulo");
  assert.equal(
    formatDateTime("2026-07-17T13:05:00.000Z"),
    "17/07/2026, 10:05",
  );
});

test("respeita a mudança de dia ao converter UTC para São Paulo", () => {
  assert.equal(
    formatDateTime("2026-07-17T02:30:00.000Z"),
    "16/07/2026, 23:30",
  );
});

test("usa fallback para data ausente ou inválida", () => {
  assert.equal(formatDateTime(null, "Nunca"), "Nunca");
  assert.equal(formatDateTime("data-inválida"), "—");
  assert.equal(toTimestamp("data-inválida"), null);
});

test("calcula a duração corretamente ao atravessar a meia-noite local", () => {
  assert.equal(
    getDurationMilliseconds(
      "2026-07-17T02:30:00.000Z",
      "2026-07-17T03:30:00.000Z",
    ),
    60 * 60 * 1_000,
  );
});
