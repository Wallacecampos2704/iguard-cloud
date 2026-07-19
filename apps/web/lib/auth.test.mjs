import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_COOKIE_NAME, extractSessionCookieValue } from "./auth.ts";

test("extrai corretamente o valor de iguard_session", () => {
  assert.equal(AUTH_COOKIE_NAME, "iguard_session");
  assert.equal(
    extractSessionCookieValue("iguard_session=abc123"),
    "abc123",
  );
});

test("funciona com atributos HttpOnly, Secure, SameSite, Path e Max-Age", () => {
  assert.equal(
    extractSessionCookieValue(
      "iguard_session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
    ),
    "abc123",
  );
});

test("rejeita header nulo", () => {
  assert.equal(extractSessionCookieValue(null), null);
});

test("rejeita header vazio", () => {
  assert.equal(extractSessionCookieValue(""), null);
});

test("rejeita cookie com outro nome", () => {
  assert.equal(extractSessionCookieValue("other_cookie=abc123"), null);
});

test("rejeita iguard_session sem valor", () => {
  assert.equal(extractSessionCookieValue("iguard_session="), null);
  assert.equal(
    extractSessionCookieValue("iguard_session=; Path=/; HttpOnly"),
    null,
  );
});

test("não devolve atributos junto com o token", () => {
  const value = extractSessionCookieValue(
    "iguard_session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
  assert.equal(value, "abc123");
  assert.ok(!value.includes(";"));
  assert.ok(!value.includes("Path"));
  assert.ok(!value.includes("HttpOnly"));
});

test("não confunde um nome parecido, como other_iguard_session", () => {
  assert.equal(
    extractSessionCookieValue("other_iguard_session=abc123"),
    null,
  );
});
