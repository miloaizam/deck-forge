/**
 * Una plancha de cartas como imagen PNG: la baraja en /baraja y /barajas, y la
 * coleccion (lo que se tiene o lo que falta) en /coleccion. Las dos se
 * comparten donde un enlace dice menos que una foto: redes, un chat.
 *
 * Se dibuja en un <canvas> del navegador: sin servidor, sin dependencias y sin
 * nada externo. Las miniaturas salen del propio origen, asi que el canvas no
 * queda "contaminado" y se puede exportar; y el PNG se baja con un Blob y un
 * <a download>, igual que el respaldo JSON. Nada de esto pasa por la CSP: no se
 * inyecta ningun script ni se carga nada de fuera.
 *
 * En el telefono la pagina solo cargo las miniaturas que se vieron, asi que
 * exportar las pide casi todas a la red de una vez, y en una red movil algunas
 * fallaban y quedaban como hueco gris. Por eso se piden de a pocas, con
 * reintentos, con la imagen grande como respaldo y esperando a que esten
 * decodificadas antes de dibujarlas (`cargar`).
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
  /** Las cartas baneadas: el mismo rojo del lazo `.lazo-baneada`. */
  baneada: "#b91c1c",
} as const;

const ANCHO = 1600;
const MARGEN = 56;
const HUECO = 14;
/** Columnas de cartas: diez, y mas si la plancha no cabe (ver `columnasPara`). */
const COLUMNAS = 10;
/**
 * Alto maximo del canvas. Safari de iOS no dibuja un canvas de mas de ~16,7
 * millones de pixeles (y lo deja en blanco sin avisar): a 1600 de ancho, unos
 * 10 000 de alto. Una coleccion grande achica las cartas antes que pasarse.
 */
const ALTO_MAXIMO = 10_000;

export interface CartaEnPlancha {
  thumb: string;
  /** Lo que va en la pastilla de abajo: "×3", "×1 · inicial". */
  etiqueta: string;
  /** La pastilla en violeta en vez de oscura: el oro inicial. */
  destacada?: boolean;
  /** Borde y cinta roja: la carta esta baneada. */
  baneada?: boolean;
}

export interface TramoDePlancha {
  titulo: string;
  /** El numero de la pastilla junto al titulo. */
  cuenta: number;
  cartas: CartaEnPlancha[];
}

export interface Plancha {
  /** La linea violeta de arriba: "BARAJA · ESCUELAS ELEMENTALES". */
  etiqueta: string;
  titulo: string;
  /** Una nota de hasta dos lineas bajo el titulo. */
  nota?: string;
  /** Un aviso en rojo bajo el titulo (las baneadas de una baraja). */
  avisoRojo?: string;
  tramos: TramoDePlancha[];
  /** El nombre del archivo, sin extension. */
  archivo: string;
}

/** Un intento de carga. `null` si falla o si llega vacia. */
function intento(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      // Safari de iOS dispara `onload` antes de decodificar, y `drawImage` de
      // una imagen sin decodificar no dibuja nada ni avisa. `decode()` espera
      // a que este lista; si el navegador no lo tiene o falla, se sigue con
      // la imagen cargada.
      try {
        await img.decode();
      } catch {
        // sin decode(): se dibuja igual
      }
      resolve(img.naturalWidth > 0 ? img : null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pausas antes de cada reintento: en una red movil el corte suele ser breve. */
const REINTENTOS_MS = [300, 900];

/**
 * Carga una imagen probando cada fuente en orden, con reintentos. Una imagen
 * que no llega deja su hueco en gris, no tumba la exportacion.
 */
async function cargar(...fuentes: string[]): Promise<HTMLImageElement | null> {
  for (const src of fuentes) {
    for (let i = 0; i <= REINTENTOS_MS.length; i++) {
      if (i > 0) await espera(REINTENTOS_MS[i - 1]);
      const img = await intento(src);
      if (img) return img;
    }
  }
  return null;
}

/** Cuantas imagenes se piden a la vez, como el navegador por conexion. */
const EN_PARALELO = 6;

/** `fn` sobre cada elemento, de a `n` a la vez, conservando el orden. */
async function deAPocos<T, R>(
  items: T[],
  n: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, trabajador));
  return out;
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

/** El tamano de las cartas con `columnas` por fila. */
function medidas(columnas: number) {
  const w = Math.floor((ANCHO - MARGEN * 2 - HUECO * (columnas - 1)) / columnas);
  // Proporcion del arte: 512 x 732 (CARD_RATIO).
  return { w, h: Math.round((w * 732) / 512) };
}

/** El alto que ocupan los tramos con `columnas` por fila. */
function altoTramos(tramos: TramoDePlancha[], columnas: number): number {
  const { h } = medidas(columnas);
  return tramos.reduce(
    (s, t) => s + 40 + Math.ceil(t.cartas.length / columnas) * (h + HUECO) + 24,
    0,
  );
}

/** Diez columnas si caben; si no, las que hagan falta para no pasar del alto. */
function columnasPara(tramos: TramoDePlancha[], resto: number): number {
  let c = COLUMNAS;
  while (c < 40 && resto + altoTramos(tramos, c) > ALTO_MAXIMO) c++;
  return c;
}

/**
 * Dibuja la plancha y la baja como PNG. Lanza si el navegador no puede.
 */
export async function downloadCardSheet(p: Plancha): Promise<void> {
  await document.fonts.ready;
  const fuente = getComputedStyle(document.body).fontFamily;

  // Si la miniatura no llega, se prueba con la imagen grande de la carta, que
  // vive en la misma ruta sin `thumb/` (asi en todo el catalogo).
  const miniaturas = [...new Set(p.tramos.flatMap((t) => t.cartas.map((c) => c.thumb)))];
  const imagenes = new Map(
    await deAPocos(miniaturas, EN_PARALELO, async (thumb) => {
      const grande = thumb.replace("/cards/thumb/", "/cards/");
      return [thumb, await cargar(thumb, grande)] as const;
    }),
  );
  const logo = await cargar("/brand/logo-white.svg");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas 2d");
  const f = (peso: number, px: number) => `${peso} ${px}px ${fuente}`;

  // Primero se mide el alto: la cabecera depende de cuantas lineas ocupe la
  // nota, y cada tramo de cuantas filas de cartas tenga.
  ctx.font = f(400, 20);
  const nota = p.nota?.trim() ? lineas(ctx, p.nota.trim(), ANCHO - MARGEN * 2, 2) : [];
  const altoCabecera = 34 + 70 + nota.length * 30 + (p.avisoRojo ? 52 : 0) + 28;
  const altoPie = 80 + MARGEN / 2;
  const columnas = columnasPara(p.tramos, MARGEN + altoCabecera + altoPie);
  const { w: CARTA_W, h: CARTA_H } = medidas(columnas);
  // Las pastillas y la cinta se achican con la carta.
  const escala = Math.min(1, CARTA_W / medidas(COLUMNAS).w);
  const alto = MARGEN + altoCabecera + altoTramos(p.tramos, columnas) + altoPie;

  canvas.width = ANCHO;
  canvas.height = alto;

  // Fondo de forja, como la portada.
  const g = ctx.createRadialGradient(ANCHO * 0.3, 0, 0, ANCHO * 0.3, 0, ANCHO);
  g.addColorStop(0, COLOR.fondoAlto);
  g.addColorStop(0.7, COLOR.fondo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, alto);

  // Cabecera: etiqueta, titulo y nota.
  let y = MARGEN;
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.acento;
  ctx.font = f(500, 16);
  ctx.letterSpacing = "4px";
  ctx.fillText(p.etiqueta.toUpperCase(), MARGEN, y);
  ctx.letterSpacing = "0px";
  y += 34;
  ctx.fillStyle = COLOR.ink;
  ctx.font = f(700, 48);
  ctx.fillText(p.titulo, MARGEN, y, ANCHO - MARGEN * 2);
  y += 70;
  ctx.fillStyle = COLOR.muted;
  ctx.font = f(400, 20);
  for (const l of nota) {
    ctx.fillText(l, MARGEN, y);
    y += 30;
  }
  if (p.avisoRojo) {
    ctx.font = f(700, 18);
    const w = Math.min(ctx.measureText(p.avisoRojo).width + 32, ANCHO - MARGEN * 2);
    ctx.fillStyle = COLOR.baneada;
    ctx.beginPath();
    ctx.roundRect(MARGEN, y + 6, w, 38, 19);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.avisoRojo, MARGEN + 16, y + 16, w - 32);
    y += 52;
  }
  y += 28;

  // Los tramos: titulo con su total y la grilla de cartas, con su pastilla.
  for (const t of p.tramos) {
    ctx.fillStyle = COLOR.ink;
    ctx.font = f(700, 18);
    ctx.letterSpacing = "2px";
    ctx.fillText(t.titulo.toUpperCase(), MARGEN, y);
    const anchoTitulo = ctx.measureText(t.titulo.toUpperCase()).width;
    ctx.letterSpacing = "0px";
    ctx.font = f(700, 15);
    const cuenta = String(t.cuenta);
    const anchoCuenta = Math.max(44, ctx.measureText(cuenta).width + 24);
    ctx.fillStyle = COLOR.marca;
    ctx.beginPath();
    ctx.roundRect(MARGEN + anchoTitulo + 14, y - 3, anchoCuenta, 26, 13);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(cuenta, MARGEN + anchoTitulo + 14 + anchoCuenta / 2, y + 2);
    ctx.textAlign = "left";
    y += 40;

    t.cartas.forEach((carta, i) => {
      const x = MARGEN + (i % columnas) * (CARTA_W + HUECO);
      const cy = y + Math.floor(i / columnas) * (CARTA_H + HUECO);
      const img = imagenes.get(carta.thumb);
      const radio = Math.max(4, 9 * escala);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, cy, CARTA_W, CARTA_H, radio);
      ctx.clip();
      if (img) ctx.drawImage(img, x, cy, CARTA_W, CARTA_H);
      else {
        ctx.fillStyle = COLOR.panel;
        ctx.fillRect(x, cy, CARTA_W, CARTA_H);
      }
      ctx.restore();
      ctx.strokeStyle = carta.baneada ? COLOR.baneada : COLOR.linea;
      ctx.lineWidth = carta.baneada ? 4 : 1;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, cy + 0.5, CARTA_W - 1, CARTA_H - 1, radio);
      ctx.stroke();
      ctx.lineWidth = 1;
      if (carta.baneada) {
        // La misma etiqueta que el lazo de la grilla, arriba de la carta.
        ctx.fillStyle = COLOR.baneada;
        ctx.fillRect(x + 2, cy + 10 * escala, CARTA_W - 4, 26 * escala);
        ctx.fillStyle = "#ffffff";
        ctx.font = f(700, Math.round(14 * escala));
        ctx.textAlign = "center";
        ctx.fillText("BANEADA", x + CARTA_W / 2, cy + 15 * escala);
        ctx.textAlign = "left";
      }

      // La pastilla abajo a la derecha: las copias.
      ctx.font = f(700, Math.round(16 * escala));
      const w = ctx.measureText(carta.etiqueta).width + 18 * escala;
      ctx.fillStyle = carta.destacada ? COLOR.marca : "rgba(13, 11, 20, 0.85)";
      ctx.beginPath();
      ctx.roundRect(
        x + CARTA_W - w - 6 * escala,
        cy + CARTA_H - 34 * escala,
        w,
        28 * escala,
        14 * escala,
      );
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        carta.etiqueta,
        x + CARTA_W - w + 3 * escala,
        cy + CARTA_H - 28 * escala,
      );
    });
    y += Math.ceil(t.cartas.length / columnas) * (CARTA_H + HUECO) + 24;
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
  a.download = `${p.archivo}.png`;
  a.click();
  // Safari de iOS empieza la descarga despues de este tick: revocar en el acto
  // puede cortarla.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Un texto apto para nombre de archivo: "Dragón Control" -> "dragon-control". */
export function slugArchivo(texto: string): string {
  const base = texto
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "sin-nombre";
}
