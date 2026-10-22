import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NOVIDADES, VERSAO } from "../../src/lib/version.ts";

const ROOT = path.resolve(".");

function parseVersao(v) {
  return v.split(".").map(Number);
}

function comparaVersao(a, b) {
  const [a1, a2, a3] = parseVersao(a);
  const [b1, b2, b3] = parseVersao(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

test("NOVIDADES tem a versão atual no topo", () => {
  assert.ok(NOVIDADES.length > 0, "NOVIDADES não pode estar vazia");
  assert.equal(
    NOVIDADES[0].versao,
    VERSAO,
    `O primeiro item de NOVIDADES deve ser a versão atual (${VERSAO})`
  );
});

test("NOVIDADES possui entre 1 e 5 versões registradas", () => {
  assert.ok(
    NOVIDADES.length >= 1 && NOVIDADES.length <= 5,
    `NOVIDADES deve ter entre 1 e 5 versões para manter o modal leve em campo (atual: ${NOVIDADES.length})`
  );
});

test("NOVIDADES está em ordem estritamente decrescente de versão", () => {
  for (let i = 0; i < NOVIDADES.length - 1; i++) {
    const atual = NOVIDADES[i].versao;
    const proxima = NOVIDADES[i + 1].versao;
    assert.ok(
      comparaVersao(atual, proxima) > 0,
      `Versão ${atual} deve ser estritamente mais recente que ${proxima}`
    );
  }
});

test("Todas as versões e datas de NOVIDADES existem no CHANGELOG.md", () => {
  const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");

  for (const nov of NOVIDADES) {
    assert.match(
      nov.data,
      /^\d{4}-\d{2}-\d{2}$/,
      `Data da versão ${nov.versao} deve estar no formato AAAA-MM-DD (atual: ${nov.data})`
    );

    const regex = new RegExp(`## \\[${nov.versao.replace(/\./g, "\\.")}\\] - ${nov.data}`);
    assert.match(
      changelog,
      regex,
      `CHANGELOG.md deve conter a entrada exata: ## [${nov.versao}] - ${nov.data}`
    );
  }
});

test("Itens de NOVIDADES seguem as regras de redação de campo Labor Rural", () => {
  const tiposValidos = new Set(["novo", "melhorou", "corrigido"]);

  for (const nov of NOVIDADES) {
    assert.ok(nov.itens.length > 0, `Versão ${nov.versao} deve ter pelo menos 1 item de novidade`);

    for (const item of nov.itens) {
      assert.ok(
        tiposValidos.has(item.tipo),
        `Tipo "${item.tipo}" inválido na versão ${nov.versao}. Permitidos: novo, melhorou, corrigido`
      );

      assert.ok(
        item.texto.length <= 160,
        `Frase excede 160 caracteres (${item.texto.length} chars) na versão ${nov.versao}: "${item.texto}"`
      );

      assert.ok(
        !/<[^>]*>/.test(item.texto),
        `Frase não pode conter tags HTML na versão ${nov.versao}: "${item.texto}"`
      );
    }
  }
});

