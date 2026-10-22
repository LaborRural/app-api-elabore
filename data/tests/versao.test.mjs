import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { VERSAO } from "../../src/lib/version.ts";

const ROOT = path.resolve(".");

test("VERSAO obedece ao padrão semântico estrito X.Y.Z (apenas números)", () => {
  assert.match(
    VERSAO,
    /^\d+\.\d+\.\d+$/,
    `VERSAO "${VERSAO}" deve seguir o formato estrito MAIOR.MENOR.CORREÇÃO (ex: 0.7.0)`
  );
});

test("package.json version bate com VERSAO", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(
    pkg.version,
    VERSAO,
    `package.json (${pkg.version}) deve ser igual a VERSAO (${VERSAO})`
  );
});

test("README.md contém referência à VERSAO atual", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const esperada = `**Versão Atual:** \`v${VERSAO}\``;
  assert.ok(
    readme.includes(esperada),
    `README.md deve conter a linha exata: ${esperada}`
  );
});

test("CHANGELOG.md contém seção da VERSAO atual lançada", () => {
  const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const regexVersao = new RegExp(`## \\[${VERSAO.replace(/\./g, "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`);
  assert.match(
    changelog,
    regexVersao,
    `CHANGELOG.md deve conter a seção lançada: ## [${VERSAO}] - AAAA-MM-DD`
  );
});

test("CHANGELOG.md possui seção [Não lançado] no topo", () => {
  const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  assert.ok(
    changelog.includes("## [Não lançado]"),
    "CHANGELOG.md deve manter a seção ## [Não lançado] no topo para entregas contínuas"
  );
});

test("app-shell.tsx exibe o elemento #snVersao com VERSAO", () => {
  const appShell = fs.readFileSync(path.join(ROOT, "src/components/app-shell.tsx"), "utf8");
  assert.ok(
    appShell.includes('id="snVersao"'),
    "app-shell.tsx deve conter o id='snVersao' para acessibilidade e testes"
  );
  assert.ok(
    appShell.includes("Versão {VERSAO}"),
    "app-shell.tsx deve exibir dinamicamente Versão {VERSAO}"
  );
});

