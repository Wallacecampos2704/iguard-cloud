import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthenticatedHeaders,
  resolveAuthenticatedApiUrl,
} from "./api-auth.ts";

const FAKE_TOKEN = "token-de-teste";

test("resolveAuthenticatedApiUrl combina API_URL e /devices", () => {
  assert.equal(
    resolveAuthenticatedApiUrl("http://localhost:4000", "/devices"),
    "http://localhost:4000/devices",
  );
});

test("resolveAuthenticatedApiUrl remove barra final de API_URL", () => {
  assert.equal(
    resolveAuthenticatedApiUrl("http://localhost:4000/", "/devices"),
    "http://localhost:4000/devices",
  );
  assert.equal(
    resolveAuthenticatedApiUrl("http://localhost:4000///", "/devices"),
    "http://localhost:4000/devices",
  );
});

test("resolveAuthenticatedApiUrl preserva a porta da API", () => {
  assert.equal(
    resolveAuthenticatedApiUrl("http://localhost:4000", "/incidents"),
    "http://localhost:4000/incidents",
  );
});

test("resolveAuthenticatedApiUrl aceita subrotas", () => {
  assert.equal(
    resolveAuthenticatedApiUrl(
      "http://localhost:4000",
      "/devices/check-all",
    ),
    "http://localhost:4000/devices/check-all",
  );
  assert.equal(
    resolveAuthenticatedApiUrl(
      "http://localhost:4000",
      "/incidents/123/resolve",
    ),
    "http://localhost:4000/incidents/123/resolve",
  );
});

test("resolveAuthenticatedApiUrl rejeita path sem barra inicial", () => {
  assert.throws(
    () => resolveAuthenticatedApiUrl("http://localhost:4000", "devices"),
    TypeError,
  );
});

test("resolveAuthenticatedApiUrl rejeita path vazio", () => {
  assert.throws(
    () => resolveAuthenticatedApiUrl("http://localhost:4000", ""),
    TypeError,
  );
});

test("resolveAuthenticatedApiUrl rejeita path iniciado por //", () => {
  assert.throws(
    () =>
      resolveAuthenticatedApiUrl(
        "http://localhost:4000",
        "//dominio-externo.com",
      ),
    TypeError,
  );
});

test("resolveAuthenticatedApiUrl rejeita http://", () => {
  assert.throws(
    () =>
      resolveAuthenticatedApiUrl(
        "http://localhost:4000",
        "http://dominio-externo.com",
      ),
    TypeError,
  );
});

test("resolveAuthenticatedApiUrl rejeita https://", () => {
  assert.throws(
    () =>
      resolveAuthenticatedApiUrl(
        "http://localhost:4000",
        "https://dominio-externo.com",
      ),
    TypeError,
  );
});

test("resolveAuthenticatedApiUrl nunca permite substituir o domínio da API", () => {
  const maliciousInputs = [
    "//dominio-externo.com/devices",
    "http://dominio-externo.com/devices",
    "https://dominio-externo.com/devices",
  ];

  for (const path of maliciousInputs) {
    assert.throws(
      () => resolveAuthenticatedApiUrl("http://localhost:4000", path),
      TypeError,
      `deveria rejeitar: ${path}`,
    );
  }
});

test("buildAuthenticatedHeaders cria Cookie com iguard_session", () => {
  const headers = buildAuthenticatedHeaders(undefined, FAKE_TOKEN);
  assert.equal(headers.get("Cookie"), `iguard_session=${FAKE_TOKEN}`);
});

test("buildAuthenticatedHeaders preserva Content-Type", () => {
  const headers = buildAuthenticatedHeaders(
    { "Content-Type": "application/json" },
    FAKE_TOKEN,
  );
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(headers.get("Cookie"), `iguard_session=${FAKE_TOKEN}`);
});

test("buildAuthenticatedHeaders preserva header customizado", () => {
  const headers = buildAuthenticatedHeaders(
    { "X-Custom-Header": "valor" },
    FAKE_TOKEN,
  );
  assert.equal(headers.get("X-Custom-Header"), "valor");
});

test("buildAuthenticatedHeaders sobrescreve um Cookie fornecido pelo caller", () => {
  const headers = buildAuthenticatedHeaders(
    { Cookie: "outro_cookie=valor-arbitrario" },
    FAKE_TOKEN,
  );
  assert.equal(headers.get("Cookie"), `iguard_session=${FAKE_TOKEN}`);
});

test("buildAuthenticatedHeaders não cria Authorization", () => {
  const headers = buildAuthenticatedHeaders(undefined, FAKE_TOKEN);
  assert.equal(headers.get("Authorization"), null);
});

test("buildAuthenticatedHeaders rejeita token vazio", () => {
  assert.throws(() => buildAuthenticatedHeaders(undefined, ""), TypeError);
});

test("buildAuthenticatedHeaders retorna uma instância de Headers", () => {
  const headers = buildAuthenticatedHeaders(undefined, FAKE_TOKEN);
  assert.ok(headers instanceof Headers);
});

test("buildAuthenticatedHeaders não altera o objeto Headers original recebido", () => {
  const original = new Headers({ "Content-Type": "application/json" });
  const headers = buildAuthenticatedHeaders(original, FAKE_TOKEN);

  assert.equal(original.get("Cookie"), null);
  assert.notEqual(headers, original);
});
