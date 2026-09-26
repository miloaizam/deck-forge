// CSP con hashes: quita 'unsafe-inline' de script-src despues del build.
//
// El App Router incrusta en cada HTML unos pocos <script> inline (el payload
// de hidratacion y el script del tema), y sin servidor no hay nonce. Pero el
// HTML es estatico: se puede calcular el sha256 de cada bloque y autorizar
// exactamente esos. Este script lo hace sobre out/ y reescribe out/_headers:
//
//   - La regla `/*` lleva los hashes de out/404.html, porque Cloudflare sirve
//     esa pagina para cualquier ruta que no exista (`not_found_handling`).
//   - Cada pagina lleva su propia regla, que QUITA la CSP de `/*` con
//     `! Content-Security-Policy` y pone la suya. Sin el `!`, Cloudflare une
//     las dos con una coma y el navegador aplica las dos politicas a la vez.
//
// Semantica leida en el asset worker de Cloudflare (@cloudflare/workers-shared):
// las reglas casan contra el pathname exacto, sin query string, en el orden
// del archivo; una cabecera repetida se une con coma y `!` la borra.
//
// Lee siempre public/_headers y escribe out/_headers, asi que correrlo dos
// veces da lo mismo. Falla (codigo 1) si algo no cuadra: mejor un build roto
// que un sitio en blanco.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const PLANTILLA = path.join(ROOT, "public", "_headers");

// Limites de _headers en Cloudflare. Se comprueban aqui y en audit_build.py.
const MAX_LINEA = 2000;
const MAX_REGLAS = 100;

// Un <script> sin src. El navegador hashea el texto tal cual esta entre las
// etiquetas (dentro de <script> no se decodifican entidades).
const INLINE = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

// Lo que la plantilla tiene que traer, para reemplazarlo con los hashes.
const SCRIPT_SRC = "script-src 'self' 'unsafe-inline'";

// `next/script` con `beforeInteractive` no escribe su codigo como <script>:
// lo deja como dato en `self.__next_s` y el runtime de Next crea el <script>
// despues, ya con la pagina cargada. Ese script tambien pasa por la CSP y no
// esta en el HTML, asi que hay que sacar su codigo del dato y hashearlo. Es
// el script del tema del layout raiz.
const NEXT_S = /^\(self\.__next_s=self\.__next_s\|\|\[\]\)\.push\((.*)\)$/s;

const sha = (codigo) =>
  `'sha256-${createHash("sha256").update(codigo, "utf8").digest("base64")}'`;

function hashes(html) {
  const vistos = new Set();
  for (const [, codigo] of html.matchAll(INLINE)) {
    vistos.add(sha(codigo));
    const diferido = codigo.match(NEXT_S);
    if (!diferido) continue;
    const [, props] = JSON.parse(diferido[1]);
    if (typeof props?.children === "string") vistos.add(sha(props.children));
    else abortar("un next/script inline sin `children` de texto: no se hashearlo");
  }
  return [...vistos];
}

function paginas(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return paginas(ruta);
    return e.name === "index.html" ? [ruta] : [];
  });
}

/** out/catalogo/bushido/index.html -> /catalogo/bushido/ */
function rutaPublica(archivo) {
  const rel = path.relative(OUT, path.dirname(archivo)).split(path.sep).join("/");
  return rel === "" ? "/" : `/${rel}/`;
}

function abortar(msg) {
  console.error(`csp-hashes: ${msg}`);
  process.exit(1);
}

const plantilla = readFileSync(PLANTILLA, "utf8");
const lineasCsp = plantilla.match(/^\s+Content-Security-Policy:.*$/gm) ?? [];
if (lineasCsp.length !== 1) {
  abortar(`public/_headers deberia tener una sola CSP y tiene ${lineasCsp.length}`);
}
const base = lineasCsp[0].replace(/^\s+Content-Security-Policy:\s*/, "");
if (!base.includes(SCRIPT_SRC)) {
  abortar(`la CSP de public/_headers no trae "${SCRIPT_SRC}", no se que reemplazar`);
}

const politica = (lista) =>
  base.replace(SCRIPT_SRC, `script-src 'self' ${lista.join(" ")}`);

const hashes404 = hashes(readFileSync(path.join(OUT, "404.html"), "utf8"));
let salida = plantilla.replace(base, politica(hashes404));

const reglas = paginas(OUT)
  .map((archivo) => ({
    ruta: rutaPublica(archivo),
    lista: hashes(readFileSync(archivo, "utf8")),
  }))
  .sort((a, b) => a.ruta.localeCompare(b.ruta));

salida += [
  "",
  "# ------------------------------------------------------------------",
  "# CSP por pagina. Lo escribe scripts/csp-hashes.mjs en cada build:",
  "# no editar aqui, que se pierde. Cada regla quita la CSP de /* y pone",
  "# la suya con los hashes de los <script> inline de esa pagina.",
  "# ------------------------------------------------------------------",
  ...reglas.flatMap(({ ruta, lista }) => [
    ruta,
    "  ! Content-Security-Policy",
    `  Content-Security-Policy: ${politica(lista)}`,
  ]),
  "",
].join("\n");

const largas = salida.split("\n").filter((l) => l.length > MAX_LINEA);
if (largas.length > 0) {
  abortar(`${largas.length} linea(s) pasan de ${MAX_LINEA} caracteres`);
}
const totalReglas = salida.split("\n").filter((l) => /^\//.test(l)).length;
if (totalReglas > MAX_REGLAS) {
  abortar(`${totalReglas} reglas en _headers, el maximo es ${MAX_REGLAS}`);
}

writeFileSync(path.join(OUT, "_headers"), salida);
const total = new Set(reglas.flatMap((r) => r.lista)).size;
console.log(
  `csp-hashes: ${reglas.length} paginas, ${total} hashes distintos, ${totalReglas} reglas en _headers`,
);
