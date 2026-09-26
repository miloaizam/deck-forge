// Activa los hooks de pre-commit al hacer `pnpm install` (script `prepare`).
//
// No falla nunca: un install no se rompe porque falten los hooks. Si
// pre-commit no esta en el venv, avisa como instalarlo y sigue.
//
// De paso deshace el hook anterior, que apuntaba core.hooksPath a .githooks/:
// con esa opcion puesta, `pre-commit install` se niega a instalar.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// En CI y fuera de un clon de git no hay nada que instalar.
if (process.env.CI || !existsSync(path.join(ROOT, ".git"))) process.exit(0);

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: "pipe" }).trim();

try {
  if (git("config", "--get", "core.hooksPath") === ".githooks") {
    git("config", "--unset", "core.hooksPath");
  }
} catch {
  // `git config --get` sale con 1 cuando la opcion no existe: nada que hacer.
}

const candidatos = [
  path.join(ROOT, ".venv", "bin", "pre-commit"),
  path.join(ROOT, ".venv", "Scripts", "pre-commit.exe"),
];
const preCommit = candidatos.find((c) => existsSync(c));

if (!preCommit) {
  console.log(
    "hooks: pre-commit no esta en .venv. Para activarlo:\n" +
      "  .venv/bin/pip install -r requirements.txt && .venv/bin/pre-commit install",
  );
  process.exit(0);
}

try {
  execFileSync(preCommit, ["install"], { cwd: ROOT, stdio: "inherit" });
} catch {
  console.log("hooks: `pre-commit install` fallo; correlo a mano para ver por que.");
}
