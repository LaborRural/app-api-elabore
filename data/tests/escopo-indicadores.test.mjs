import test from "node:test";
import assert from "node:assert/strict";
import { resolveElaboreScope } from "../../src/lib/elabore-scope.ts";

const prop = (id, code, agro) => ({ id_property: id, labor_rural_code: code, id_agroindustry: agro });

// Consultor com fazendas em duas agroindústrias
const PROPS = [prop("p1", "lr001", "a1"), prop("p2", "LR002", "a1"), prop("p3", "LR003", "a2")];

test("interno sem filtros consulta a base inteira", () => {
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: true }), { kind: "all" });
});

test("interno com filtro de fazenda fica restrito a ela", () => {
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: true, prop: "p2" }), {
    kind: "codes",
    codes: ["LR002"],
  });
});

test("consultor multi-agroindústria sem filtros vê só os códigos do seu /properties", () => {
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: false }), {
    kind: "codes",
    codes: ["LR001", "LR002", "LR003"],
  });
});

test("filtro de agroindústria reduz o escopo", () => {
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: false, agro: "a2" }), {
    kind: "codes",
    codes: ["LR003"],
  });
});

test("fazenda de outro usuário (URL manipulada) resulta em vazio, não em tabela inteira", () => {
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: false, prop: "pX" }), { kind: "empty" });
  assert.deepEqual(resolveElaboreScope(PROPS, { internal: false, prop: "pX", hasIdPropertyColumn: true }), {
    kind: "empty",
  });
});

test("catálogo vazio (falha da API) nunca vira escopo global para usuário comum", () => {
  assert.deepEqual(resolveElaboreScope([], { internal: false }), { kind: "empty" });
});

test("fazenda sem código LR usa id_property quando a tabela tem a coluna", () => {
  const props = [prop("p9", null, "a1")];
  assert.deepEqual(resolveElaboreScope(props, { internal: false, prop: "p9", hasIdPropertyColumn: true }), {
    kind: "property",
    idProperty: "p9",
  });
  assert.deepEqual(resolveElaboreScope(props, { internal: false, prop: "p9" }), { kind: "empty" });
});

test("códigos repetidos são deduplicados", () => {
  const props = [prop("p1", "LR001", "a1"), prop("p2", " lr001 ", "a1")];
  assert.deepEqual(resolveElaboreScope(props, { internal: false }), { kind: "codes", codes: ["LR001"] });
});
