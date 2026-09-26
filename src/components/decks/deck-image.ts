import { slugNombre } from "./actions";
import { deckTitle } from "@/lib/deck";
import type { ResolvedDeck, ResolvedEntry } from "@/lib/deck-rules";
import { SECCIONES_DE_LA_BARAJA, type Deck } from "@/lib/types";

/**
 * La baraja como imagen PNG, para compartirla donde un enlace dice menos que
 * una foto (redes, un chat).
 *
 * Se dibuja en un <canvas> del navegador: sin servidor, sin dependencias y sin
 * nada externo. Las miniaturas salen del propio origen, asi que el canvas no
 * queda "contaminado" y se puede exportar; y el PNG se baja con un Blob y un
 * <a download>, igual que el respaldo JSON. Nada de esto pasa por la CSP: no se
 * inyecta ningun script ni se carga nada de fuera.
 */

/**
 * Los colores del tema OSCURO, siempre: la imagen se ve igual la baje quien la
 * baje. Es un espejo de los tokens de globals.css, porque el canvas no lee
 * clases de Tailwind; si cambia la paleta, se cambia aqui tambien.
 */
const COLOR = {
  fondo: "#0d0b14",
  fondoAlto: "#1d1633",
  panel: "#1b1730",
  linea: "#2a2342",
  ink: "#ede9f7",
  muted: "#9a93b5",
  acento: "#a78bfa",
  marca: "#7c3aed",
} as const;

const ANCHO = 1600;
const MARGEN = 56;
const COLUMNAS = 10;
const HUECO = 14;
const CARTA_W = Math.floor((ANCHO - MARGEN * 2 - HUECO * (COLUMNAS - 1)) / COLUMNAS);
/** Proporcion del arte: 512 x 732 (CARD_RATIO). */
const CARTA_H = Math.round((CARTA_W * 732) / 512);

interface Tramo {
  titulo: string;
  filas: ResolvedEntry[];
}

function tramos(res: ResolvedDeck): Tramo[] {
  const lista: Tramo[] = SECCIONES_DE_LA_BARAJA.map(({ tipo, titulo }) => ({
    titulo,
    filas: res.principal.filter((e) => e.card.tipo === tipo),
  }));
  lista.push({ titulo: "Side deck", filas: res.side });
  return lista.filter((t) => t.filas.length > 0);
}

function cargar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    // Una imagen que no llega deja su hueco en gris, no tumba la exportacion.
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Parte un texto en lineas que quepan en `ancho`, hasta `maxLineas`. */
function lineas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  ancho: number,
  maxLineas: number,
) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= ancho) actual = prueba;
    else {
      if (actual) out.push(actual);
      actual = p;
    }
  }
  if (actual) out.push(actual);
  if (out.length > maxLineas) {
    out.length = maxLineas;
    out[maxLineas - 1] = `${out[maxLineas - 1].replace(/\s*\S*$/, "")}…`;
  }
  return out;
}

/**
 * Dibuja la baraja y la baja como PNG. Lanza si el navegador no puede.
 *
 * Solo lleva el nombre, la nota y las cartas: sin conteo, legalidad ni
 * afinidad, que en una imagen para compartir sobran (las cartas ya lo dicen).
 */
export async function downloadDeckImage(deck: Deck, res: ResolvedDeck): Promise<void> {
  await document.fonts.ready;
  const fuente = getComputedStyle(document.body).fontFamily;

  const lista = tramos(res);
  const ids = [...new Set(lista.flatMap((t) => t.filas.map((f) => f.card.thumb)))];
  const imagenes = new Map(
    await Promise.all(ids.map(async (src) => [src, await cargar(src)] as const)),
  );
  const logo = await cargar("/brand/logo-white.svg");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas 2d");
  const f = (peso: number, px: number) => `${peso} ${px}px ${fuente}`;

  // Primero se mide el alto: la cabecera depende de cuantas lineas ocupe la
  // descripcion, y cada tramo de cuantas filas de cartas tenga.
  ctx.font = f(400, 20);
  const nota = deck.descripcion.trim()
    ? lineas(ctx, deck.descripcion.trim(), ANCHO - MARGEN * 2, 2)
    : [];
  const altoCabecera = 34 + 70 + nota.length * 30 + 28;
  const altoTramo = (t: Tramo) =>
    40 + Math.ceil(t.filas.length / COLUMNAS) * (CARTA_H + HUECO) + 24;
  const alto =
    MARGEN + altoCabecera + lista.reduce((s, t) => s + altoTramo(t), 0) + 80 + MARGEN / 2;

  canvas.width = ANCHO;
  canvas.height = alto;

  // Fondo de forja, como la portada.
  const g = ctx.createRadialGradient(ANCHO * 0.3, 0, 0, ANCHO * 0.3, 0, ANCHO);
  g.addColorStop(0, COLOR.fondoAlto);
  g.addColorStop(0.7, COLOR.fondo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, alto);

  // Cabecera: etiqueta, nombre y nota.
  let y = MARGEN;
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.acento;
  ctx.font = f(500, 16);
  ctx.letterSpacing = "4px";
  ctx.fillText("BARAJA · ESCUELAS ELEMENTALES", MARGEN, y);
  ctx.letterSpacing = "0px";
  y += 34;
  ctx.fillStyle = COLOR.ink;
  ctx.font = f(700, 48);
  ctx.fillText(deckTitle(deck), MARGEN, y, ANCHO - MARGEN * 2);
  y += 70;
  ctx.fillStyle = COLOR.muted;
  ctx.font = f(400, 20);
  for (const l of nota) {
    ctx.fillText(l, MARGEN, y);
    y += 30;
  }
  y += 28;

  // Los tramos: titulo con su total y la grilla de cartas, con las copias.
  for (const t of lista) {
    const cuenta = t.filas.reduce((s, e) => s + e.n, 0);
    ctx.fillStyle = COLOR.ink;
    ctx.font = f(700, 18);
    ctx.letterSpacing = "2px";
    ctx.fillText(t.titulo.toUpperCase(), MARGEN, y);
    const anchoTitulo = ctx.measureText(t.titulo.toUpperCase()).width;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = COLOR.marca;
    ctx.beginPath();
    ctx.roundRect(MARGEN + anchoTitulo + 14, y - 3, 44, 26, 13);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = f(700, 15);
    ctx.textAlign = "center";
    ctx.fillText(String(cuenta), MARGEN + anchoTitulo + 36, y + 2);
    ctx.textAlign = "left";
    y += 40;

    t.filas.forEach((fila, i) => {
      const x = MARGEN + (i % COLUMNAS) * (CARTA_W + HUECO);
      const cy = y + Math.floor(i / COLUMNAS) * (CARTA_H + HUECO);
      const img = imagenes.get(fila.card.thumb);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, cy, CARTA_W, CARTA_H, 9);
      ctx.clip();
      if (img) ctx.drawImage(img, x, cy, CARTA_W, CARTA_H);
      else {
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(x, cy, CARTA_W, CARTA_H);
      }
      ctx.restore();
      ctx.strokeStyle = COLOR.linea;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, cy + 0.5, CARTA_W - 1, CARTA_H - 1, 9);
      ctx.stroke();

      // Las copias, en una pastilla abajo a la derecha.
      const esOroInicial = t.titulo !== "Side deck" && fila.card.id === deck.oroInicial;
      const etiqueta = esOroInicial ? `×${fila.n} · inicial` : `×${fila.n}`;
      ctx.font = f(700, 16);
      const w = ctx.measureText(etiqueta).width + 18;
      ctx.fillStyle = esOroInicial ? COLOR.marca : "rgba(13, 11, 20, 0.85)";
      ctx.beginPath();
      ctx.roundRect(x + CARTA_W - w - 6, cy + CARTA_H - 34, w, 28, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(etiqueta, x + CARTA_W - w + 3, cy + CARTA_H - 28);
    });
    y += Math.ceil(t.filas.length / COLUMNAS) * (CARTA_H + HUECO) + 24;
  }

  // Pie: el logotipo y el sitio.
  y += 12;
  ctx.strokeStyle = COLOR.linea;
  ctx.beginPath();
  ctx.moveTo(MARGEN, y);
  ctx.lineTo(ANCHO - MARGEN, y);
  ctx.stroke();
  y += 24;
  if (logo) ctx.drawImage(logo, MARGEN, y, 160, 32);
  ctx.fillStyle = COLOR.muted;
  ctx.font = f(400, 18);
  ctx.textAlign = "right";
  ctx.fillText("deckforge-myl.pages.dev", ANCHO - MARGEN, y + 6);
  ctx.textAlign = "left";

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("toBlob fallo");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `baraja-${slugNombre(deck)}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
