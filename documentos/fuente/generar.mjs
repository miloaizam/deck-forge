/**
 * Genera los PDFs de public/reglas/ a partir de los datos transcritos de
 * documentos/fuente/*.json: el DAR, la Fe de Erratas y la Banlist con el
 * estilo de DeckForge (tema oscuro, A4 vertical). Los tres llevan el mismo
 * molde: portada, indice enlazado, secciones y "Notas de la transcripcion" al
 * final, igual que sus paginas en el sitio.
 *
 * Uso, desde la raiz del repo:
 *
 *   node documentos/fuente/generar.mjs
 *
 * La tipografia sale de fuente/fuentes/: Space Grotesk en cuatro pesos
 * estaticos (ver documentos/README.md). Las cartas de ejemplo del DAR, de
 * public/data/cards.json y public/cards/.
 *
 * Imprime con Playwright + Chromium, que NO es dependencia del repo: se busca
 * en PLAYWRIGHT_PATH o en la instalacion global. Los PDFs quedan en
 * public/reglas/, que se publica tal cual; la pagina /documentos los enlaza y
 * pinta los mismos datos como HTML (src/app/(app)/documentos/).
 */

import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const FUENTE = import.meta.dirname;
const SALIDA = path.join(RAIZ, "public", "reglas");
const VERSION = "261023"; // AAMMDD de esta transcripcion, en el nombre del archivo

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

/* ------------------------------------------------------------------ *
 * Estilos comunes: tokens del tema oscuro de src/app/globals.css
 * ------------------------------------------------------------------ */

const CSS = `
${[400, 500, 600, 700].map((w) => `@font-face { font-family: "Space Grotesk"; font-weight: ${w}; src: url("sg-${w}.woff2") format("woff2"); }`).join("\n")}
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
.notas { margin: 0; padding-left: 6mm; }
.notas li { margin-bottom: 2mm; color: var(--muted); }
.notas li::marker { color: var(--accent); font-weight: 600; }
.notas b { color: var(--ink); font-weight: 600; }
a { color: inherit; }
/* El indice: el mismo en los tres documentos. */
.indice { columns: 2; column-gap: 8mm; }
.indice .grupo { break-inside: avoid; margin-bottom: 3.5mm; }
.indice h3 { font-size: 10.5pt; margin-bottom: .8mm; }
.indice h3 a { color: var(--ink); text-decoration: none; }
.indice h3 .num { color: var(--accent); margin-right: 1.6mm; }
.indice ol { margin: 0; padding-left: 0; list-style: none; color: var(--muted); }
.indice li { margin: .3mm 0; }
.indice ol a { color: var(--muted); text-decoration: none; }
.indice .num { font-variant-numeric: tabular-nums; }
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

/**
 * El indice enlazado, el mismo en los tres: grupos con su titulo (y su cuenta
 * o su numero) y, si los tienen, sus entradas.
 */
function indice(bajada, grupos) {
  return `<section><p class="eyebrow">Índice</p><h2 class="seccion" style="margin-top:2mm">Contenido</h2>
    <p class="seccion-bajada">${esc(bajada)}</p>
    <div class="indice">${grupos
      .map(
        (g) =>
          `<div class="grupo"><h3><a href="#${g.id}">${g.numero ? `<span class="num">${esc(g.numero)}</span>` : ""}${esc(g.titulo)}</a>${g.cuenta !== undefined ? ` <span class="cuenta">${g.cuenta}</span>` : ""}</h3>${
            g.hijos?.length
              ? `<ol>${g.hijos
                  .map(
                    (h) =>
                      `<li><a href="#${h.id}">${h.numero ? `<span class="num">${esc(h.numero)}</span> ` : ""}${esc(h.titulo)}</a></li>`,
                  )
                  .join("")}</ol>`
              : ""
          }</div>`,
      )
      .join("")}</div></section>`;
}

const ID_NOTAS = "notas-de-la-transcripcion";

/** "Notas de la transcripcion", al final de los tres. */
function notasTranscripcion(notas) {
  return `<section class="bloque" id="${ID_NOTAS}"><p class="eyebrow">Transcripción</p>
    <h2 class="seccion" style="margin-top:2mm">Notas de la transcripción</h2>
    <p class="seccion-bajada">Lo que se corrigió del documento original al pasarlo al sitio.</p>
    <ol class="notas">${notas
      .map((n) => `<li>${n.sobre ? `<b>${esc(n.sobre)}:</b> ` : ""}${esc(n.texto)}</li>`)
      .join("")}</ol></section>`;
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
      aviso: `Transcripción de DeckForge del documento oficial «${esc(doc.original.titulo)}», última actualización ${esc(doc.original.actualizacion)}. Versión del ${esc(doc.version)}. El texto de las cartas se copia tal cual del original; solo se corrigieron erratas del propio documento, anotadas en cada carta y reunidas al final.`,
    }),
    indice("Las cartas por edición, en el orden del documento original.", [
      ...grupos.map(([ed, l]) => ({
        id: ancla(ed),
        titulo: ed,
        cuenta: l.length,
        hijos: l.map((e) => ({ id: ancla(e.nombre), titulo: e.nombre })),
      })),
      { id: ID_NOTAS, titulo: "Notas de la transcripción" },
    ]),
    ...grupos.map(
      ([ed, l]) =>
        `<section class="edicion" id="${ancla(ed)}"><p class="eyebrow">Edición</p><h2 class="seccion" style="margin-top:2mm">${esc(ed)} <span class="cuenta">${l.length}</span></h2>${l
          .map(fichaCarta)
          .join("")}</section>`,
    ),
    notasTranscripcion(
      doc.entradas
        .filter((e) => e.correccion)
        .map((e) => ({ sobre: e.nombre, texto: e.correccion })),
    ),
  ].join("\n");
  return { html, css: CSS_ERRATAS, doc };
}

/* ------------------------------------------------------------------ *
 * Banlist
 * ------------------------------------------------------------------ */

const CSS_BANLIST = `
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
      aviso: `Transcripción de DeckForge del documento oficial «${esc(doc.original.titulo)}» (modificado el ${esc(doc.original.modificado)}). Versión del ${esc(doc.version)}. Se corrigió la ortografía del documento y los nombres de carta según el catálogo; está al final, en las notas de la transcripción.`,
    }),
    indice("Las tres listas de la Banlist, en el orden del documento original.", [
      { id: "prohibidas", titulo: "Prohibidas", cuenta: doc.prohibidas.length },
      { id: "unicas", titulo: "Únicas", cuenta: doc.unicas.length },
      { id: "erratas", titulo: "Erratas", cuenta: doc.erratas.length },
      { id: ID_NOTAS, titulo: "Notas de la transcripción" },
    ]),
    `<section class="bloque" id="prohibidas"><p class="eyebrow">Banlist</p>
      <h2 class="seccion peligro" style="margin-top:2mm">Prohibidas <span class="cuenta">${doc.prohibidas.length}</span></h2>
      <p class="seccion-bajada">No se pueden incluir en el Mazo Castillo ni en el side deck.</p>
      <div class="rejilla">${ordenar(doc.prohibidas)
        .map((c) => `<div class="item prohibida">${esc(c)}</div>`)
        .join("")}</div>
      <h2 class="seccion" id="unicas">Únicas <span class="cuenta">${doc.unicas.length}</span></h2>
      <p class="seccion-bajada">Solo se puede llevar una copia de cada una.</p>
      <div class="rejilla">${ordenar(doc.unicas)
        .map((c) => `<div class="item unica">${esc(c)}</div>`)
        .join("")}</div>
    </section>`,
    `<section class="bloque" id="erratas"><p class="eyebrow">Banlist</p><h2 class="seccion" style="margin-top:2mm">Erratas <span class="cuenta">${doc.erratas.length}</span></h2>
      <p class="seccion-bajada">Cambios que la banlist aplica a cartas del formato.</p>
      ${doc.erratas
        .map(
          (e) =>
            `<div class="errata"><b>${esc(e.carta)}${e.edicion ? `<span class="ed">${esc(e.edicion)}</span>` : ""}</b><span>${esc(e.texto)}</span></div>`,
        )
        .join("")}
    </section>`,
    notasTranscripcion(doc.correcciones.map((texto) => ({ texto }))),
  ].join("\n");
  return { html, css: CSS_BANLIST, doc };
}

/* ------------------------------------------------------------------ *
 * DAR (Documento Actualizado de Reglas)
 * ------------------------------------------------------------------ */

/**
 * El marcado del texto del DAR: **negrita**, *cursiva*, [[id|texto]] y
 * {{Carta}}. Es la misma lectura que `leerMarcado()` de src/lib/marcado.ts,
 * que usa la version web: si cambia una, se cambia la otra.
 */
const MARCA = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[\[([^|\]]+)\|([^\]]+)\]\]|\{\{([^{}]+)\}\}/g;
function marcado(texto) {
  let html = "";
  let desde = 0;
  for (const m of texto.matchAll(MARCA)) {
    html += esc(texto.slice(desde, m.index));
    if (m[1] !== undefined) html += `<b>${esc(m[1])}</b>`;
    else if (m[2] !== undefined) html += `<i>${esc(m[2])}</i>`;
    else if (m[3] !== undefined)
      html += `<a class="ref" href="#${esc(m[3])}">${esc(m[4])}</a>`;
    else html += `<span class="carta">${esc(m[5])}</span>`;
    desde = m.index + m[0].length;
  }
  return html + esc(texto.slice(desde));
}

const claveDeNombre = (n) =>
  n
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’´`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * La impresion que se muestra de cada carta de ejemplo: la de la edicion mas
 * nueva, como `resolverCartas()` de src/lib/dar.ts (que la saca del orden del
 * catalogo). Aqui basta el prefijo del id, en el orden de las ediciones.
 */
const ORDEN_PREFIJOS = [
  "ee",
  "lg",
  "hs",
  "am",
  "sp",
  "ai",
  "ca",
  "do",
  "sn",
  "bu",
  "ad",
  "aa",
];
function cartasDelCatalogo() {
  const cartas = JSON.parse(
    readFileSync(path.join(RAIZ, "public", "data", "cards.json"), "utf-8"),
  );
  const rango = (id) => {
    const i = ORDEN_PREFIJOS.indexOf(id.slice(0, 2));
    return i === -1 ? 99 : i;
  };
  const porNombre = new Map();
  for (const c of [...cartas].sort(
    (a, b) => rango(a.id) - rango(b.id) || a.id.localeCompare(b.id),
  )) {
    const k = claveDeNombre(c.nombre);
    if (!porNombre.has(k)) porNombre.set(k, c);
  }
  return { porNombre, porId: new Map(cartas.map((c) => [c.id, c])) };
}

/**
 * La imagen de una carta, del propio sitio (public/), incrustada como data:
 * URL. Al imprimir se pasa a JPEG con un canvas, y una imagen de file:// lo
 * dejaria "contaminado" (cada archivo es su propio origen) sin poder leerlo.
 */
const img = (ruta, alt, clase, ancho = 116) =>
  `<img class="${clase}" data-jpeg="${ancho}" src="data:image/webp;base64,${readFileSync(path.join(RAIZ, "public", ruta)).toString("base64")}" alt="${esc(alt)}">`;

function cartaEjemplo(nombre, porNombre, clase = "ej") {
  const c = porNombre.get(claveDeNombre(nombre));
  return c
    ? img(c.thumb, c.nombre, clase)
    : `<span class="${clase} fuera"><b>${esc(nombre)}</b><small>Fuera del formato</small></span>`;
}

/** Espejo de PARTES de AnatomiaCarta.tsx. */
const PARTES = [
  ["A", "Nombre", 8.5, 30],
  ["B", "Coste de Oro", 91, 7.5],
  ["C", "Símbolo de carta", 7.5, 7.5],
  ["D", "Caja de texto", 8, 73],
  ["E", "Código de coleccionista", 92, 93],
  ["F", "Raza", 9.5, 14.5],
  ["G", "Texto épico", 71, 66],
  ["H", "Símbolo de Frecuencia", 83, 82.5],
  ["I", "Ilustrador", 15, 50],
];

/** Espejo de ZONAS de DiagramaArena.tsx: [id, nombre, dentro del juego, columna, fila]. */
const ZONAS = [
  ["3.3", "Oro Pagado", true, 2, 1],
  ["3.5", "Línea de Ataque", true, 3, 1],
  ["3.7", "Cementerio", false, 1, 2],
  ["3.1", "Mazo Castillo", false, 2, 2],
  ["3.4", "Línea de Defensa", true, 3, 2],
  ["3.8", "Destierro", false, 1, 3],
  ["3.2", "Reserva de Oro", true, 2, 3],
  ["3.6", "Línea de Apoyo", true, 3, 3],
];

/** Espejo de NODOS y ARISTAS de DiagramaArbol.tsx. */
const NODOS = [
  [1, 80, 175, 8],
  [2, 250, 115, 4],
  [3, 250, 245, 7],
  [4, 430, 75, 2],
  [5, 430, 150, 3],
  [7, 430, 245, 6],
  [6, 600, 75, 1],
  [8, 600, 245, 5],
];
const ARISTAS = [
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [4, 6],
  [3, 7],
  [7, 8],
];

function diagrama(cual, porId) {
  if (cual === "anatomia") {
    const wyrm = porId.get("ee-013");
    return `<figure class="anatomia"><div class="lamina">${img(wyrm.imagen, wyrm.nombre, "grande", 280)}${PARTES.map(
      ([l, , x, y]) => `<span class="marca" style="left:${x}%;top:${y}%">${l}</span>`,
    ).join(
      "",
    )}</div><figcaption><p class="pie">Las partes de una carta, sobre ${esc(wyrm.nombre)}. Cada letra es la de su regla.</p><ol>${[
      ...PARTES,
    ]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([l, parte]) =>
          `<li><span class="marca chica">${l}</span><a class="ref" href="#1-${l}">${esc(parte)}</a></li>`,
      )
      .join("")}</ol></figcaption></figure>`;
  }
  if (cual === "arena") {
    return `<figure><div class="arena"><span class="arena-titulo">Arena de juego</span>${ZONAS.map(
      ([id, nombre, dentro, col, fila]) =>
        `<a href="#${id}" class="zona ${dentro ? "dentro" : "fuera"}" style="grid-column:${col};grid-row:${fila}">${esc(nombre)}</a>`,
    ).join(
      "",
    )}</div><figcaption class="pie leyenda"><span><i class="cuadro dentro"></i>Dentro del juego</span><span><i class="cuadro fuera"></i>Fuera del juego (la Mano también)</span></figcaption></figure>`;
  }
  const W = 128;
  const H = 34;
  const nodo = new Map(NODOS.map((n) => [n[0], n]));
  const aristas = ARISTAS.map(([a, b]) => {
    const [, px, py] = nodo.get(a);
    const [, qx, qy] = nodo.get(b);
    const x1 = px + W / 2 + 4;
    const x2 = qx - W / 2 - 6;
    const m = (x1 + x2) / 2;
    return `<path d="M${x1} ${py} C${m} ${py}, ${m} ${qy}, ${x2} ${qy}" fill="none" stroke="#9a93b5" stroke-width="1.75" marker-end="url(#punta)"/>`;
  }).join("");
  const nodos = NODOS.map(
    ([
      n,
      x,
      y,
      r,
    ]) => `<rect x="${x - W / 2}" y="${y - H / 2}" width="${W}" height="${H}" rx="10" fill="#1b1730" stroke="#2a2342"/>
      <text x="${x}" y="${y + 4.5}" text-anchor="middle" fill="#ede9f7" font-size="13" font-weight="600">Habilidad ${n}</text>
      <circle cx="${x - W / 2 + 2}" cy="${y - H / 2 + 1}" r="11" fill="#7c3aed" stroke="#15121f" stroke-width="2.5"/>
      <text x="${x - W / 2 + 2}" y="${y - H / 2 + 5}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${r}</text>`,
  ).join("");
  const niveles = [80, 250, 430, 600]
    .map(
      (x, i) =>
        `<text x="${x}" y="20" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="600" letter-spacing="1.4">NIVEL ${i + 1}</text>`,
    )
    .join("");
  return `<figure><div class="lienzo"><svg viewBox="0 0 680 290" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#9a93b5"/></marker></defs>
    ${niveles}<line x1="16" x2="664" y1="32" y2="32" stroke="#2a2342" stroke-width="1.5"/>${aristas}${nodos}</svg></div>
    <figcaption class="pie">El número del círculo es el orden en que se resuelve cada habilidad.</figcaption></figure>`;
}

function bloquesDar(bloques, nivel, ctx) {
  return bloques.map((b) => bloqueDar(b, nivel, ctx)).join("");
}

function bloqueDar(b, nivel, ctx) {
  const h = Math.min(nivel, 6);
  switch (b.tipo) {
    case "parrafo":
      return `<p>${marcado(b.texto)}</p>`;
    case "nota":
      return `<p class="nota-dar">${marcado(b.texto)}</p>`;
    case "lista": {
      const t = b.ordenada ? "ol" : "ul";
      return `<${t} class="lista">${b.items.map((i) => `<li>${marcado(i)}</li>`).join("")}</${t}>`;
    }
    case "etiquetada": {
      const cortas = b.items.every((x) => x.etiqueta.length <= 4);
      return `<dl class="${cortas ? "etiquetas-cortas" : "etiquetas-largas"}">${b.items
        .map((x) => `<dt>${esc(x.etiqueta)}</dt><dd>${marcado(x.texto)}</dd>`)
        .join("")}</dl>`;
    }
    case "cartas":
      return `<figure class="cartas"><div class="fila">${b.cartas
        .map((n) => cartaEjemplo(n, ctx.porNombre))
        .join(
          "",
        )}</div>${b.pie ? `<figcaption class="pie">${esc(b.pie)}</figcaption>` : ""}</figure>`;
    case "diagrama":
      return diagrama(b.diagrama, ctx.porId);
    case "caso": {
      const cita = (b.cita ?? []).map((c) => `<p>${marcado(c)}</p>`).join("");
      const cabeza = b.carta
        ? `<div class="caso-carta">${cartaEjemplo(b.carta, ctx.porNombre, "ej chica")}<div><b>${esc(b.carta)}</b>${
            b.linea ? `<span class="linea">${esc(b.linea)}</span>` : ""
          }${cita ? `<blockquote>${cita}</blockquote>` : ""}</div></div>`
        : cita
          ? `<blockquote>${cita}</blockquote>`
          : "";
      return `<div class="caso"><p class="caso-titulo">${esc(b.titulo)}</p>${cabeza}${bloquesDar(b.bloques, nivel, ctx)}</div>`;
    }
    case "apartado":
      return `<section class="apartado n${h}" id="${esc(b.id)}"><h${h}>${
        b.numero ? `<span class="num">${esc(b.numero)}</span>` : ""
      }${esc(b.titulo)}</h${h}>${bloquesDar(b.bloques, nivel + 1, ctx)}</section>`;
    case "regla": {
      const sub = /\d/.test(b.letra) && !/^\d/.test(b.letra);
      return `<div class="regla" id="${esc(b.id)}"><span class="letra${sub ? " sub" : ""}">${esc(b.letra)}</span><div>${
        b.titulo ? `<h${h} class="regla-titulo">${esc(b.titulo)}</h${h}>` : ""
      }${bloquesDar(b.bloques, nivel + 1, ctx)}</div></div>`;
    }
    default:
      throw new Error(`Bloque desconocido: ${b.tipo}`);
  }
}

const CSS_DAR = `
.dar-seccion { break-before: page; }
.dar-seccion > h2 .num, .apartado .num { color: var(--accent); margin-right: 2.4mm; font-variant-numeric: tabular-nums; }
.dar-seccion p, .dar-seccion li, .dar-seccion dd { margin: 0 0 2mm; }
.apartado { margin-top: 6mm; }
.apartado h3 { font-size: 13pt; font-weight: 700; margin-bottom: 2.5mm; break-after: avoid; }
.apartado h4, .apartado h5 { font-size: 11pt; font-weight: 700; margin-bottom: 2mm; break-after: avoid; }
.regla { display: grid; grid-template-columns: 9mm 1fr; gap: 2.6mm; margin: 3.5mm 0; }
.letra { display: inline-flex; align-items: center; justify-content: center; min-width: 7mm; height: 7mm; padding: 0 1.2mm;
  border-radius: 8px; background: var(--accent-soft); color: var(--accent); font-weight: 700; font-size: 9pt; font-variant-numeric: tabular-nums; }
.letra.sub { background: none; border: 1px solid var(--line); }
.regla-titulo { font-size: 10.5pt !important; font-weight: 700; margin: .8mm 0 1.4mm !important; break-after: avoid; }
.nota-dar { border-left: 2px solid rgb(139 92 246 / .55); padding-left: 3.5mm; color: var(--muted); }
.lista { padding-left: 5mm; margin: 0 0 2mm; }
.lista li::marker { color: var(--accent); }
.etiquetas-cortas { display: grid; grid-template-columns: max-content 1fr; gap: 1mm 3mm; margin: 0 0 2mm; }
.etiquetas-cortas dt, .etiquetas-largas dt { color: var(--accent); font-weight: 700; }
.etiquetas-largas dd { margin-left: 0; }
.ref { color: var(--accent); text-decoration: underline; text-decoration-color: rgb(139 92 246 / .45); }
.carta { color: var(--accent); }
.pie { color: var(--muted); font-size: 8.4pt; margin-top: 1.6mm !important; }
figure { margin: 4mm 0; break-inside: avoid; }
.cartas .fila { display: flex; flex-wrap: wrap; gap: 3mm; }
.ej { width: 25mm; aspect-ratio: 512 / 732; border-radius: 6px; display: block; }
.ej.chica { width: 19mm; flex-shrink: 0; }
.ej.fuera { border: 1px dashed var(--line); background: var(--surface); display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 2mm; }
.ej.fuera b { font-size: 8.6pt; }
.ej.fuera small { color: var(--muted); font-size: 7pt; }
.caso { border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 3.5mm 4mm; margin: 4mm 0; break-inside: avoid; }
.caso-titulo { color: var(--accent); font-size: 7.6pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 2.4mm !important; }
.caso-carta { display: flex; gap: 3.5mm; margin-bottom: 3mm; }
.caso-carta .linea { display: block; color: var(--muted); font-size: 8.4pt; }
blockquote { margin: 1.6mm 0 0; padding-left: 3mm; border-left: 2px solid var(--line); font-size: 9pt; }
.anatomia { display: flex; gap: 7mm; align-items: flex-start; }
.anatomia .lamina { position: relative; width: 62mm; flex-shrink: 0; }
.anatomia .grande { width: 100%; border-radius: 10px; display: block; }
.marca { position: absolute; transform: translate(-50%, -50%); width: 6mm; height: 6mm; border-radius: 50%;
  background: var(--brand); color: #fff; font-weight: 700; font-size: 8pt; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 .6mm var(--bg); }
.marca.chica { position: static; transform: none; width: 5mm; height: 5mm; font-size: 7.4pt; background: var(--accent-soft); color: var(--accent);
  box-shadow: none; display: inline-flex; margin-right: 2.4mm; vertical-align: middle; }
.anatomia ol { list-style: none; padding: 0; margin: 2mm 0 0; }
.anatomia li { margin-bottom: 1.6mm; }
.arena { display: grid; grid-template-columns: 1fr 1fr 2fr; grid-template-rows: repeat(3, 17mm); gap: 2.4mm;
  border: 1px solid var(--line); background: var(--surface); border-radius: 14px; padding: 3mm; }
.arena-titulo { grid-column: 1; grid-row: 1; align-self: center; color: var(--accent); font-size: 8pt; font-weight: 700;
  letter-spacing: .18em; text-transform: uppercase; }
.zona { display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 10px; font-weight: 600;
  text-decoration: none; font-size: 9pt; }
.zona.dentro { border: 1px solid rgb(139 92 246 / .6); background: var(--accent-soft); color: var(--ink); }
.zona.fuera { border: 1px dashed var(--line); color: var(--muted); }
.leyenda { display: flex; gap: 6mm; }
.cuadro { display: inline-block; width: 3mm; height: 3mm; border-radius: 1mm; margin-right: 1.6mm; vertical-align: -.3mm; }
.cuadro.dentro { border: 1px solid rgb(139 92 246 / .6); background: var(--accent-soft); }
.cuadro.fuera { border: 1px dashed var(--line); }
.lienzo { border: 1px solid var(--line); background: var(--surface); border-radius: 14px; padding: 3mm; }
.lienzo svg { width: 100%; display: block; font-family: "Space Grotesk", sans-serif; }
`;

function dar() {
  const doc = JSON.parse(readFileSync(path.join(FUENTE, "dar.json"), "utf-8"));
  const ctx = cartasDelCatalogo();
  const numerada = (s) => /^\d+$/.test(s.id);
  const reglas = (bs) =>
    bs.reduce((n, b) => n + (b.tipo === "regla" ? 1 : 0) + reglas(b.bloques ?? []), 0);
  const conceptos = doc.secciones
    .find((s) => s.id === "10")
    .bloques.filter((b) => b.tipo === "apartado").length;

  const html = [
    portada({
      eyebrow: "Formato Escuelas Elementales",
      titulo: "Documento<br>Actualizado<br><em>de Reglas</em>",
      bajada:
        "Cómo se juega, regla por regla: las partes de una carta, las zonas, las habilidades, las fases del turno y los conceptos del juego.",
      fichas: [
        [
          String(doc.secciones.reduce((n, s) => n + reglas(s.bloques), 0)),
          "reglas con letra",
        ],
        [String(conceptos), "conceptos de juego"],
        [String(doc.secciones.filter(numerada).length), "secciones y un anexo"],
      ],
      aviso: `Transcripción de DeckForge del documento oficial «${esc(doc.original.titulo)}», revisión de ${esc(doc.original.revision)}. Versión del ${esc(doc.version)}. El texto de las reglas se copia del original; lo que se corrigió está al final, en las notas de la transcripción.`,
    }),
    indice(
      "Las secciones y sus apartados. Cada regla se cita por su apartado y su letra: «8.1 D».",
      [
        ...doc.secciones.map((s) => ({
          id: s.id,
          numero: numerada(s) ? s.id : undefined,
          titulo: s.titulo,
          // Los 48 conceptos no caben en el indice: la seccion 10 va sola.
          hijos:
            s.id === "10"
              ? []
              : s.bloques
                  .filter((b) => b.tipo === "apartado" && b.numero)
                  .map((b) => ({ id: b.id, numero: b.numero, titulo: b.titulo })),
        })),
        { id: ID_NOTAS, titulo: "Notas de la transcripción" },
      ],
    ),
    ...doc.secciones.map(
      (s) =>
        `<section class="dar-seccion" id="${esc(s.id)}"><p class="eyebrow">${numerada(s) ? `Sección ${s.id}` : "Anexo"}</p>
        <h2 class="seccion" style="margin-top:2mm;margin-bottom:4mm">${numerada(s) ? `<span class="num">${s.id}</span>` : ""}${esc(s.titulo)}</h2>
        ${bloquesDar(s.bloques, 3, ctx)}</section>`,
    ),
    notasTranscripcion(doc.correcciones.map((texto) => ({ texto }))),
  ].join("\n");
  return { html, css: CSS_DAR, doc };
}

/* ------------------------------------------------------------------ *
 * Impresion
 * ------------------------------------------------------------------ */

// El pie se dibuja aparte de la pagina y no ve sus @font-face: la letra va
// incrustada en el propio pie. Con la "sans-serif" del sistema (variable),
// Chromium la guardaba como Type3 una vez por hoja.
const LETRA_PIE = readFileSync(path.join(FUENTE, "fuentes", "sg-400.woff2")).toString(
  "base64",
);
const PIE = (
  titulo,
) => `<style>@font-face{font-family:SGPie;src:url(data:font/woff2;base64,${LETRA_PIE})}</style>
  <div style="width:100%;font-family:SGPie,sans-serif;font-size:7px;color:#9a93b5;padding:0 15mm;
  display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">
  <span>${esc(titulo)} · Transcripción de DeckForge · deckforge-myl.pages.dev</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

const tmp = mkdtempSync(path.join(tmpdir(), "deckforge-docs-"));
for (const w of [400, 500, 600, 700])
  copyFileSync(
    path.join(FUENTE, "fuentes", `sg-${w}.woff2`),
    path.join(tmp, `sg-${w}.woff2`),
  );
copyFileSync(
  path.join(RAIZ, "public", "brand", "logo-white.svg"),
  path.join(tmp, "logo.svg"),
);

const browser = await chromium.launch();
try {
  for (const [archivo, titulo, armar] of [
    [`DAR-${VERSION}.pdf`, "Documento Actualizado de Reglas · Escuelas Elementales", dar],
    [`FeDeErratas-${VERSION}.pdf`, "Fe de Erratas · Escuelas Elementales", feDeErratas],
    [`BanlistEstandar-${VERSION}.pdf`, "Banlist Formato Estándar RE MyL", banlist],
  ]) {
    const { html, css } = armar();
    const html_path = path.join(tmp, archivo.replace(".pdf", ".html"));
    writeFileSync(html_path, pagina(titulo, { html, css }));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(html_path).href);
    await page.evaluate(() => document.fonts.ready);
    // Las cartas van al PDF como JPEG y achicadas al ancho que se imprimen
    // (`data-jpeg`, ~115 ppp): Chromium guarda tal cual una imagen JPEG, pero
    // una WebP la descomprime y la guarda sin perdida. Con las ~45 cartas a su
    // tamano, el DAR pesaba 2 MB.
    await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("img[data-jpeg]")];
      await Promise.all(imgs.map((i) => i.decode()));
      for (const i of imgs) {
        const lienzo = document.createElement("canvas");
        const escala = Math.min(1, Number(i.dataset.jpeg) / i.naturalWidth);
        lienzo.width = Math.round(i.naturalWidth * escala);
        lienzo.height = Math.round(i.naturalHeight * escala);
        const g = lienzo.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(i, 0, 0, lienzo.width, lienzo.height);
        i.src = lienzo.toDataURL("image/jpeg", 0.74);
        await i.decode();
      }
    });
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
