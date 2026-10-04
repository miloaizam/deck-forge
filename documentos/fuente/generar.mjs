/**
 * Genera los PDFs de public/reglas/ a partir de los datos transcritos de
 * documentos/fuente/*.json: la Fe de Erratas y la Banlist con el estilo de
 * DeckForge (tema oscuro, A4 vertical).
 *
 * Uso, desde la raiz del repo y con el sitio ya construido (la tipografia se
 * toma del build, igual que docs/og-image.html):
 *
 *   pnpm run build
 *   node documentos/fuente/generar.mjs
 *
 * Imprime con Playwright + Chromium, que NO es dependencia del repo: se busca
 * en PLAYWRIGHT_PATH o en la instalacion global. Los PDFs quedan en
 * public/reglas/, que se publica tal cual; la pagina /documentos los enlaza y
 * pinta los mismos datos como HTML (src/app/(app)/documentos/).
 */

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const FUENTE = import.meta.dirname;
const SALIDA = path.join(RAIZ, "public", "reglas");
const VERSION = "260926"; // AAMMDD de esta transcripcion, en el nombre del archivo

const PLAYWRIGHT =
  process.env.PLAYWRIGHT_PATH ?? "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);

/* ------------------------------------------------------------------ *
 * Utilidades
 * ------------------------------------------------------------------ */

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Los saltos de linea del texto de una carta se respetan. */
const conSaltos = (html) => html.replaceAll("\n", "<br>");

const ancla = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Diferencia por palabras (LCS) entre dos textos. Devuelve el HTML de los dos
 * lados: en el de antes se tacha lo que se va, en el de despues se resalta lo
 * que llega. La puntuacion va pegada a su palabra, que es como se lee.
 *
 * Es la misma logica que `wordDiff()` de src/lib/word-diff.ts, que usa la
 * version web: si cambia una, se cambia la otra.
 */
function diff(a, b) {
  const A = a.split(/(\s+)/).filter((t) => t !== "");
  const B = b.split(/(\s+)/).filter((t) => t !== "");
  const n = A.length;
  const m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const izq = [];
  const der = [];
  let i = 0;
  let j = 0;
  const marca = (lista, tag, tok) => {
    // Los espacios no se marcan: solo ensuciarian el subrayado.
    if (/^\s+$/.test(tok)) lista.push(conSaltos(esc(tok)));
    else lista.push(`<${tag}>${conSaltos(esc(tok))}</${tag}>`);
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      izq.push(conSaltos(esc(A[i])));
      der.push(conSaltos(esc(B[j])));
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) marca(izq, "del", A[i++]);
    else marca(der, "ins", B[j++]);
  }
  while (i < n) marca(izq, "del", A[i++]);
  while (j < m) marca(der, "ins", B[j++]);
  // Marcas vecinas se funden: "<ins>de</ins> <ins>esta</ins>" -> un solo tramo.
  const fundir = (h, t) => h.replaceAll(new RegExp(`</${t}>(\\s*)<${t}>`, "g"), "$1");
  return [fundir(izq.join(""), "del"), fundir(der.join(""), "ins")];
}

function fuenteSpaceGrotesk() {
  const chunks = path.join(RAIZ, "out", "_next", "static", "chunks");
  for (const f of readdirSync(chunks).filter((x) => x.endsWith(".css"))) {
    const css = readFileSync(path.join(chunks, f), "utf-8");
    for (const bloque of css.match(/@font-face\{[^}]*\}/g) ?? []) {
      if (bloque.includes("Space Grotesk") && bloque.includes("U+??")) {
        const url = bloque.match(/url\(\.\.\/media\/([^)]+)\)/)[1];
        return path.join(RAIZ, "out", "_next", "static", "media", url);
      }
    }
  }
  throw new Error("No encontre Space Grotesk en out/: corre `pnpm run build` antes.");
}

/* ------------------------------------------------------------------ *
 * Estilos comunes: tokens del tema oscuro de src/app/globals.css
 * ------------------------------------------------------------------ */

const CSS = `
@font-face { font-family: "Space Grotesk"; font-weight: 300 700; src: url("space-grotesk.woff2") format("woff2"); }
:root {
  --bg: #0d0b14; --surface: #15121f; --panel: #1b1730; --line: #2a2342;
  --ink: #ede9f7; --muted: #9a93b5; --accent: #a78bfa; --accent-soft: #241b45;
  --brand: #7c3aed; --brand-500: #8b5cf6; --danger: #f87171; --success: #34d399; --warning: #fbbf24;
}
@page { size: A4; margin: 16mm 15mm 18mm; background: #0d0b14; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body { font-family: "Space Grotesk", "DejaVu Sans", sans-serif; font-size: 9.6pt; line-height: 1.5;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3, h4 { margin: 0; }

/* Portada: ocupa la primera hoja entera, con el fondo de forja. */
.portada { height: 263mm; display: flex; flex-direction: column; justify-content: space-between;
  padding: 10mm 6mm 6mm; border: 1px solid var(--line); border-radius: 18px;
  background: radial-gradient(120% 90% at 30% 10%, #1d1633 0%, #0c0a13 70%); break-after: page; position: relative; overflow: hidden; }
/* Un degradado y no un filtro blur: el blur se imprime como una imagen enorme. */
.portada .halo { position: absolute; top: -90mm; left: 50%; width: 200mm; height: 200mm; transform: translateX(-50%);
  background: radial-gradient(circle, rgb(109 40 217 / .32) 0%, rgb(109 40 217 / 0) 65%); }
.portada > * { position: relative; }
.portada img { width: 58mm; }
.eyebrow { font-size: 8.5pt; letter-spacing: .3em; text-transform: uppercase; color: var(--accent); }
.portada h1 { font-size: 40pt; line-height: 1.05; font-weight: 700; letter-spacing: -.02em; margin-top: 5mm; color: var(--ink); }
.portada h1 em { font-style: normal; color: var(--accent); }
.portada .bajada { font-size: 12.5pt; color: var(--muted); margin-top: 5mm; max-width: 130mm; }
.fichas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.ficha { border: 1px solid var(--line); background: rgb(27 23 48 / .7); border-radius: 12px; padding: 3.5mm 4mm; }
.ficha b { display: block; font-size: 15pt; font-weight: 700; }
.ficha span { color: var(--muted); font-size: 8.5pt; }
.aviso { color: var(--muted); font-size: 8.2pt; border-top: 1px solid var(--line); padding-top: 3.5mm; }

h2.seccion { font-size: 17pt; font-weight: 700; letter-spacing: -.01em; margin: 0 0 1.5mm; }
.seccion-bajada { color: var(--muted); margin: 0 0 5mm; }
.bloque { break-before: page; }
.pastilla { display: inline-block; border-radius: 999px; padding: .4mm 2.4mm; font-size: 7.8pt; font-weight: 600;
  border: 1px solid var(--line); color: var(--muted); white-space: nowrap; }
.pastilla.acento { color: var(--accent); background: var(--accent-soft); border-color: transparent; }
.pastilla.peligro { color: var(--danger); border-color: rgb(248 113 113 / .45); }
.cuenta { background: var(--brand); color: #fff; border-radius: 999px; padding: .3mm 2.4mm; font-size: 8pt; font-weight: 700;
  margin-left: 2mm; vertical-align: 2px; }
del { color: var(--danger); text-decoration: line-through; text-decoration-color: rgb(248 113 113 / .8); background: rgb(248 113 113 / .10); border-radius: 3px; }
ins { color: #fff; text-decoration: none; background: rgb(124 58 237 / .45); border-radius: 3px; padding: 0 .4mm; }
.notas li { margin-bottom: 1.6mm; color: var(--muted); }
`;

function pagina(titulo, cuerpo) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>${CSS}${cuerpo.css ?? ""}</style></head><body>${cuerpo.html}</body></html>`;
}

function portada({ eyebrow, titulo, bajada, fichas, aviso }) {
  return `<section class="portada"><div class="halo"></div>
  <div><img src="logo.svg" alt="DeckForge"><p class="eyebrow" style="margin-top:14mm">${esc(eyebrow)}</p>
  <h1>${titulo}</h1><p class="bajada">${esc(bajada)}</p></div>
  <div><div class="fichas">${fichas.map(([n, t]) => `<div class="ficha"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join("")}</div>
  <p class="aviso" style="margin-top:6mm">${aviso}</p></div></section>`;
}

/* ------------------------------------------------------------------ *
 * Fe de Erratas
 * ------------------------------------------------------------------ */

const ORDEN_EDICIONES = [
  "Dominio",
  "ContraAtaque",
  "Águila Imperial",
  "Steampunk",
  "Axis Mundi",
  "Hijos del Sol",
  "Legado Gótico",
  "Escuelas Elementales",
  "Otras ediciones",
];
const ETIQUETA_CAMBIO = {
  habilidad: "Habilidad",
  raza: "Raza",
  nombre: "Nombre",
  frecuencia: "Frecuencia",
};

function fichaCarta(e) {
  const meta = [
    e.tipo,
    e.raza,
    e.coste !== null ? `Coste ${e.coste}` : null,
    e.fuerza !== null ? `Fuerza ${e.fuerza}` : null,
  ].filter(Boolean);

  let cuerpo;
  if (e.cambio !== "habilidad") {
    // Un dato suelto: nombre, raza o frecuencia. Va en una linea.
    cuerpo = `<div class="dato"><span class="lado">Donde dice</span><del>${esc(e.antes)}</del>
      <span class="flecha">▸</span><span class="lado">Debe decir</span><ins>${esc(e.despues)}</ins></div>`;
  } else if (e.versiones) {
    cuerpo = `<div class="par"><div class="caja antes"><h4>Donde dice</h4><ol class="versiones">${e.versiones
      .map((v) => `<li><del>${esc(v)}</del></li>`)
      .join("")}</ol></div>
      <div class="caja ahora"><h4>Debe decir</h4><p><ins>${esc(e.despues)}</ins></p></div></div>`;
  } else if (e.intermedio) {
    const [a, b1] = diff(e.antes, e.intermedio.texto);
    const [, c] = diff(e.intermedio.texto, e.despues);
    cuerpo = `<div class="trio">
      <div class="caja antes"><h4>Donde dice</h4><p>${a}</p></div>
      <div class="caja medio"><h4>${esc(e.intermedio.etiqueta)}</h4><p>${b1}</p></div>
      <div class="caja ahora"><h4>${esc(e.etiquetaDespues ?? "Debe decir")}</h4><p>${c}</p></div></div>`;
  } else {
    const [a, b] = diff(e.antes, e.despues);
    cuerpo = `<div class="par"><div class="caja antes"><h4>Donde dice</h4><p>${a}</p></div>
      <div class="caja ahora"><h4>${esc(e.etiquetaDespues ?? "Debe decir")}</h4><p>${b}</p></div></div>`;
  }

  const notas = [e.nota, e.correccion].filter(Boolean);
  return `<article class="entrada" id="${ancla(e.nombre)}">
    <header><div><h3>${esc(e.nombre)}</h3><p class="meta">${meta.map(esc).join(" · ")}</p></div>
    <div class="etiquetas"><span class="pastilla">${esc(e.codigo)}</span>
    <span class="pastilla acento">${ETIQUETA_CAMBIO[e.cambio]}</span></div></header>
    ${cuerpo}
    ${notas.map((n) => `<p class="nota">${esc(n)}</p>`).join("")}
  </article>`;
}

const CSS_ERRATAS = `
.indice { columns: 2; column-gap: 8mm; }
.indice .grupo { break-inside: avoid; margin-bottom: 4mm; }
.indice h3 { font-size: 10.5pt; color: var(--accent); margin-bottom: 1mm; }
.indice ol { margin: 0; padding-left: 7mm; color: var(--muted); }
.indice a { color: var(--ink); text-decoration: none; }
.leyenda { display: flex; gap: 6mm; margin: 0 0 6mm; color: var(--muted); font-size: 8.6pt; }
.edicion { break-before: page; }
.edicion > h2 { margin-bottom: 5mm; }
.entrada { break-inside: avoid; border: 1px solid var(--line); background: var(--surface); border-radius: 14px;
  padding: 4mm 4.5mm; margin-bottom: 4.5mm; }
.entrada header { display: flex; justify-content: space-between; gap: 4mm; align-items: flex-start; margin-bottom: 3mm; }
.entrada h3 { font-size: 12.5pt; font-weight: 700; }
.meta { margin: .4mm 0 0; color: var(--muted); font-size: 8.4pt; }
.etiquetas { display: flex; gap: 1.5mm; flex-shrink: 0; }
.par { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.trio { display: grid; gap: 2.5mm; }
.caja { border-radius: 10px; padding: 2.6mm 3.2mm; background: var(--panel); border: 1px solid var(--line); }
.caja.ahora { border-color: rgb(139 92 246 / .55); }
.caja h4 { font-size: 7.4pt; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 1.2mm; font-weight: 600; }
.caja.ahora h4 { color: var(--accent); }
.caja p { margin: 0; }
.versiones { margin: 0; padding-left: 4.5mm; }
.dato { display: flex; flex-wrap: wrap; align-items: center; gap: 2.4mm; background: var(--panel); border: 1px solid var(--line);
  border-radius: 10px; padding: 2.6mm 3.2mm; }
.dato .lado { font-size: 7.4pt; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
.dato .flecha { color: var(--accent); }
.nota { margin: 2.4mm 0 0; color: var(--muted); font-size: 8.2pt; }
.nota::before { content: "Nota · "; color: var(--accent); font-weight: 600; }
`;

function feDeErratas() {
  const doc = JSON.parse(readFileSync(path.join(FUENTE, "fe-de-erratas.json"), "utf-8"));
  const grupos = ORDEN_EDICIONES.map((ed) => [
    ed,
    doc.entradas.filter((e) => e.edicion === ed),
  ]).filter(([, l]) => l.length > 0);
  const sinGrupo = doc.entradas.filter((e) => !ORDEN_EDICIONES.includes(e.edicion));
  if (sinGrupo.length)
    throw new Error(`Edicion desconocida: ${sinGrupo.map((e) => e.edicion)}`);

  const porCambio = (c) => doc.entradas.filter((e) => e.cambio === c).length;
  const html = [
    portada({
      eyebrow: "Formato Escuelas Elementales",
      titulo: "Fe de<br><em>Erratas</em>",
      bajada:
        "El texto vigente de cada carta corregida: lo que dice la carta impresa y lo que debe decir, con el cambio resaltado.",
      fichas: [
        [String(doc.entradas.length), "cartas corregidas"],
        [String(porCambio("habilidad")), "cambios de habilidad"],
        [
          String(doc.entradas.length - porCambio("habilidad")),
          "de nombre, raza o frecuencia",
        ],
      ],
      aviso: `Transcripción de DeckForge del documento oficial «${esc(doc.original.titulo)}», última actualización ${esc(doc.original.actualizacion)}. Versión del ${esc(doc.version)}. El texto de las cartas se copia tal cual del original; solo se corrigieron erratas del propio documento, anotadas en cada caso.`,
    }),
    `<section><p class="eyebrow">Índice</p><h2 class="seccion" style="margin-top:2mm">Cartas por edición</h2>
     <p class="seccion-bajada">Dentro de cada edición, en el orden del documento original.</p>
     <div class="leyenda"><span><del>Tachado</del>: lo que sale</span><span><ins>Resaltado</ins>: lo que entra</span></div>
     <div class="indice">${grupos
       .map(
         ([ed, l]) =>
           `<div class="grupo"><h3>${esc(ed)} <span class="cuenta">${l.length}</span></h3><ol>${l
             .map((e) => `<li><a href="#${ancla(e.nombre)}">${esc(e.nombre)}</a></li>`)
             .join("")}</ol></div>`,
       )
       .join("")}</div></section>`,
    ...grupos.map(
      ([ed, l]) =>
        `<section class="edicion"><p class="eyebrow">Edición</p><h2 class="seccion" style="margin-top:2mm">${esc(ed)} <span class="cuenta">${l.length}</span></h2>${l
          .map(fichaCarta)
          .join("")}</section>`,
    ),
  ].join("\n");
  return { html, css: CSS_ERRATAS, doc };
}

/* ------------------------------------------------------------------ *
 * Banlist
 * ------------------------------------------------------------------ */

const CSS_BANLIST = `
.regla { border: 1px solid rgb(139 92 246 / .6); background: var(--accent-soft); border-radius: 14px; padding: 4mm 5mm;
  font-size: 11pt; font-weight: 600; margin-bottom: 7mm; }
.regla span { display: block; font-size: 7.4pt; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: 1mm; }
.rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm 3mm; margin-bottom: 8mm; }
.item { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 2mm 3mm; font-weight: 600; break-inside: avoid; }
.item.prohibida { border-color: rgb(248 113 113 / .5); }
.item.prohibida::before { content: "✕"; color: var(--danger); margin-right: 2mm; }
.item.unica::before { content: "1"; display: inline-block; width: 4.2mm; height: 4.2mm; line-height: 4.2mm; text-align: center;
  border-radius: 50%; background: var(--brand); color: #fff; font-size: 7pt; margin-right: 2mm; vertical-align: 1px; }
h2.seccion.peligro { color: var(--danger); }
.errata { display: grid; grid-template-columns: 44mm 1fr; gap: 4mm; padding: 2.6mm 0; border-bottom: 1px solid var(--line); break-inside: avoid; }
.errata b { color: var(--accent); }
.errata .ed { display: block; color: var(--muted); font-size: 7.8pt; font-weight: 400; }
`;

function banlist() {
  const doc = JSON.parse(
    readFileSync(path.join(FUENTE, "banlist-estandar.json"), "utf-8"),
  );
  const col = new Intl.Collator("es");
  const ordenar = (l) => [...l].sort(col.compare);
  const html = [
    portada({
      eyebrow: "Formato Estándar RE MyL · Escuelas Elementales",
      titulo: "Banlist<br><em>Estándar</em>",
      bajada:
        "Qué cartas no se pueden jugar, cuáles van con una sola copia y las erratas que se aplican al formato.",
      fichas: [
        [String(doc.prohibidas.length), "prohibidas"],
        [String(doc.unicas.length), "cartas Únicas"],
        [String(doc.erratas.length), "erratas y ajustes"],
      ],
      aviso: `Transcripción de DeckForge del documento oficial «${esc(doc.original.titulo)}» (modificado el ${esc(doc.original.modificado)}). Versión del ${esc(doc.version)}. Se corrigió la ortografía del documento y los nombres de carta según el catálogo.`,
    }),
    `<section>
      <div class="regla"><span>Construcción del mazo</span>${esc(doc.construccion)}</div>
      <h2 class="seccion peligro">Prohibidas <span class="cuenta">${doc.prohibidas.length}</span></h2>
      <p class="seccion-bajada">No se pueden incluir en el Mazo Castillo ni en el side deck.</p>
      <div class="rejilla">${ordenar(doc.prohibidas)
        .map((c) => `<div class="item prohibida">${esc(c)}</div>`)
        .join("")}</div>
      <h2 class="seccion">Únicas <span class="cuenta">${doc.unicas.length}</span></h2>
      <p class="seccion-bajada">Solo se puede llevar una copia de cada una.</p>
      <div class="rejilla">${ordenar(doc.unicas)
        .map((c) => `<div class="item unica">${esc(c)}</div>`)
        .join("")}</div>
    </section>`,
    `<section class="bloque"><h2 class="seccion">Erratas <span class="cuenta">${doc.erratas.length}</span></h2>
      <p class="seccion-bajada">Cambios que la banlist aplica a cartas del formato.</p>
      ${doc.erratas
        .map(
          (e) =>
            `<div class="errata"><b>${esc(e.carta)}${e.edicion ? `<span class="ed">${esc(e.edicion)}</span>` : ""}</b><span>${esc(e.texto)}</span></div>`,
        )
        .join("")}
    </section>`,
  ].join("\n");
  return { html, css: CSS_BANLIST, doc };
}

/* ------------------------------------------------------------------ *
 * Impresion
 * ------------------------------------------------------------------ */

const PIE = (
  titulo,
) => `<div style="width:100%;font-family:sans-serif;font-size:7px;color:#9a93b5;padding:0 15mm;
  display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">
  <span>${esc(titulo)} · Transcripción de DeckForge · deckforge-myl.pages.dev</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

const tmp = mkdtempSync(path.join(tmpdir(), "deckforge-docs-"));
copyFileSync(fuenteSpaceGrotesk(), path.join(tmp, "space-grotesk.woff2"));
copyFileSync(
  path.join(RAIZ, "public", "brand", "logo-white.svg"),
  path.join(tmp, "logo.svg"),
);

const browser = await chromium.launch();
try {
  for (const [archivo, titulo, armar] of [
    [`FeDeErratas-${VERSION}.pdf`, "Fe de Erratas · Escuelas Elementales", feDeErratas],
    [`BanlistEstandar-${VERSION}.pdf`, "Banlist Formato Estándar RE MyL", banlist],
  ]) {
    const { html, css } = armar();
    const html_path = path.join(tmp, archivo.replace(".pdf", ".html"));
    writeFileSync(html_path, pagina(titulo, { html, css }));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(html_path).href);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(SALIDA, archivo),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: PIE(titulo),
      // Sin PDF etiquetado: con la tipografia variable, Chromium la incrusta
      // como Type3 y las etiquetas suben la Fe de Erratas a ~990 KB, pegado
      // al limite de 1 MB del pre-commit. Sin ellas queda en ~750 KB. Los
      // marcadores (outline) si van: son los titulos de cada seccion.
      tagged: false,
      outline: true,
    });
    await page.close();
    console.log(`public/reglas/${archivo}`);
  }
} finally {
  await browser.close();
}
