/**
 * Una plancha de cartas como imagen JPEG: la baraja en /baraja y /barajas, y la
 * coleccion (lo que se tiene o lo que falta) en /coleccion. Las dos se
 * comparten donde un enlace dice menos que una foto: redes, un chat.
 *
 * Se dibuja en un <canvas> del navegador: sin servidor, sin dependencias y sin
 * nada externo. Las miniaturas salen del propio origen, asi que el canvas no
 * queda "contaminado" y se puede exportar; y el JPEG se baja con un Blob y un
 * <a download>. Nada de esto pasa por la CSP: no se
 * inyecta ningun script ni se carga nada de fuera.
 *
 * En el telefono la pagina solo cargo las miniaturas que se vieron, asi que
 * exportar las pide casi todas a la red de una vez, y en una red movil algunas
 * fallaban y quedaban como hueco gris. Por eso se piden de a pocas, con
 * reintentos, con la imagen grande como respaldo y esperando a que esten
 * decodificadas antes de dibujarlas (`cargar`).
 *
 * Una lista larga no achica las cartas: se parte en varias imagenes de diez
 * columnas (`paginar`, en `lib/plancha-paginas.ts`, que explica por que).
 */

import {
  ALTO_TITULO_TRAMO,
  ANCHO,
  COLUMNAS,
  ESPACIO_TRAS_TRAMO,
  HUECO,
  LINEA_PIE,
  MARGEN,
  altoFila,
  altoTramos,
  medidas,
  paginar,
  type TramoEnPagina,
} from "@/lib/plancha-paginas";

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

export interface CartaEnPlancha {
  thumb: string;
  /** Lo que va en la pastilla de abajo: "×3", "×1 · inicial". */
  etiqueta: string;
  /** La pastilla en violeta en vez de oscura: el oro inicial. */
  destacada?: boolean;
  /** Borde y cinta roja: la carta esta baneada. */
  baneada?: boolean;
  /**
   * Lineas bajo la carta: la primera en negrita (el nombre) y las demas en
   * gris (edicion, frecuencia). La coleccion las lleva porque ahi se busca la
   * carta concreta; en una baraja el arte ya basta.
   */
  pie?: string[];
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

/** El texto recortado con "…" para que quepa en `ancho`. */
function recortar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Calidad del JPEG: al 92 % el texto y el arte no se distinguen del PNG. */
const CALIDAD_JPEG = 0.92;

/** Lo que una pagina necesita para dibujarse. */
interface Pagina {
  numero: number;
  total: number;
  tramos: TramoEnPagina<CartaEnPlancha>[];
  /** La nota ya partida en lineas: solo en la primera pagina. */
  nota: string[];
  avisoRojo?: string;
  alto: number;
}

/** Alto de la cabecera: etiqueta, titulo, nota y aviso rojo. */
const altoCabecera = (nota: number, aviso: boolean) =>
  34 + 70 + nota * 30 + (aviso ? 52 : 0) + 28;
/** El pie con el logotipo y el sitio. */
const ALTO_PIE = 80 + MARGEN / 2;

/**
 * Dibuja la plancha y la devuelve como JPEG: un archivo, o varios si la lista
 * no cabe en una imagen con las cartas a su tamano. Lanza si el navegador no
 * puede.
 */
export async function generarPlancha(p: Plancha): Promise<File[]> {
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

  const f = (peso: number, px: number) => `${peso} ${px}px ${fuente}`;
  const medidor = document.createElement("canvas").getContext("2d");
  if (!medidor) throw new Error("sin canvas 2d");

  // Primero se reparte: la nota (solo en la primera) ocupa segun sus lineas,
  // y cada pagina gasta lo suyo en cabecera y pie.
  medidor.font = f(400, 20);
  const nota = p.nota?.trim()
    ? lineas(medidor, p.nota.trim(), ANCHO - MARGEN * 2, 2)
    : [];
  const fila = altoFila(p.tramos);
  const fijoPrimera = MARGEN + altoCabecera(nota.length, Boolean(p.avisoRojo)) + ALTO_PIE;
  const fijoResto = MARGEN + altoCabecera(0, false) + ALTO_PIE;
  const reparto = paginar(p.tramos, fila, fijoPrimera, fijoResto);

  const archivos: File[] = [];
  for (const [i, tramos] of reparto.entries()) {
    const primera = i === 0;
    const pagina: Pagina = {
      numero: i + 1,
      total: reparto.length,
      tramos,
      nota: primera ? nota : [],
      avisoRojo: primera ? p.avisoRojo : undefined,
      alto: (primera ? fijoPrimera : fijoResto) + altoTramos(tramos, fila),
    };
    const blob = await dibujarPagina(p, pagina, { f, fila, imagenes, logo });
    const sufijo = pagina.total > 1 ? `-parte-${pagina.numero}-de-${pagina.total}` : "";
    archivos.push(new File([blob], `${p.archivo}${sufijo}.jpg`, { type: "image/jpeg" }));
  }
  return archivos;
}

async function dibujarPagina(
  p: Plancha,
  pagina: Pagina,
  {
    f,
    fila: FILA,
    imagenes,
    logo,
  }: {
    f: (peso: number, px: number) => string;
    fila: number;
    imagenes: Map<string, HTMLImageElement | null>;
    logo: HTMLImageElement | null;
  },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas 2d");
  const { w: CARTA_W, h: CARTA_H } = medidas();
  const alto = pagina.alto;

  canvas.width = ANCHO;
  canvas.height = alto;

  // Fondo de forja, como la portada.
  const g = ctx.createRadialGradient(ANCHO * 0.3, 0, 0, ANCHO * 0.3, 0, ANCHO);
  g.addColorStop(0, COLOR.fondoAlto);
  g.addColorStop(0.7, COLOR.fondo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, alto);

  // Cabecera: etiqueta, titulo (con la parte, si hay varias) y nota.
  let y = MARGEN;
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.acento;
  ctx.font = f(500, 16);
  ctx.letterSpacing = "4px";
  ctx.fillText(p.etiqueta.toUpperCase(), MARGEN, y);
  ctx.letterSpacing = "0px";
  y += 34;
  const titulo =
    pagina.total > 1
      ? `${p.titulo} · Parte ${pagina.numero} de ${pagina.total}`
      : p.titulo;
  ctx.fillStyle = COLOR.ink;
  ctx.font = f(700, 48);
  ctx.fillText(titulo, MARGEN, y, ANCHO - MARGEN * 2);
  y += 70;
  ctx.fillStyle = COLOR.muted;
  ctx.font = f(400, 20);
  for (const l of pagina.nota) {
    ctx.fillText(l, MARGEN, y);
    y += 30;
  }
  if (pagina.avisoRojo) {
    ctx.font = f(700, 18);
    const w = Math.min(ctx.measureText(pagina.avisoRojo).width + 32, ANCHO - MARGEN * 2);
    ctx.fillStyle = COLOR.baneada;
    ctx.beginPath();
    ctx.roundRect(MARGEN, y + 6, w, 38, 19);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(pagina.avisoRojo, MARGEN + 16, y + 16, w - 32);
    y += 52;
  }
  y += 28;

  // Los tramos: titulo con su total y la grilla de cartas, con su pastilla.
  for (const t of pagina.tramos) {
    const tituloTramo = `${t.titulo.toUpperCase()}${t.continua ? " (CONT.)" : ""}`;
    ctx.fillStyle = COLOR.ink;
    ctx.font = f(700, 18);
    ctx.letterSpacing = "2px";
    ctx.fillText(tituloTramo, MARGEN, y);
    const anchoTitulo = ctx.measureText(tituloTramo).width;
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
    y += ALTO_TITULO_TRAMO;

    t.cartas.forEach((carta, i) => {
      const x = MARGEN + (i % COLUMNAS) * (CARTA_W + HUECO);
      const cy = y + Math.floor(i / COLUMNAS) * FILA;
      const img = imagenes.get(carta.thumb);
      const radio = 9;
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
        ctx.fillRect(x + 2, cy + 10, CARTA_W - 4, 26);
        ctx.fillStyle = "#ffffff";
        ctx.font = f(700, 14);
        ctx.textAlign = "center";
        ctx.fillText("BANEADA", x + CARTA_W / 2, cy + 15);
        ctx.textAlign = "left";
      }

      // La pastilla abajo a la derecha: las copias.
      ctx.font = f(700, 16);
      const w = ctx.measureText(carta.etiqueta).width + 18;
      ctx.fillStyle = carta.destacada ? COLOR.marca : "rgba(13, 11, 20, 0.85)";
      ctx.beginPath();
      ctx.roundRect(x + CARTA_W - w - 6, cy + CARTA_H - 34, w, 28, 14);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(carta.etiqueta, x + CARTA_W - w + 3, cy + CARTA_H - 28);

      // El pie: nombre y, debajo, edicion y frecuencia, cada uno en su linea.
      carta.pie?.forEach((texto, j) => {
        ctx.fillStyle = j === 0 ? COLOR.ink : COLOR.muted;
        ctx.font = f(j === 0 ? 700 : 400, j === 0 ? 14 : 12);
        ctx.fillText(recortar(ctx, texto, CARTA_W), x, cy + CARTA_H + 8 + j * LINEA_PIE);
      });
    });
    y += Math.ceil(t.cartas.length / COLUMNAS) * FILA + ESPACIO_TRAS_TRAMO;
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

  // JPEG y no PNG: el arte de las cartas es casi una foto y en PNG una pagina
  // llena pesaba ~26 MB (WhatsApp manda como documento lo que pasa de ~16).
  // Al 92 % pesa ~6 MB y no se distingue; el fondo es oscuro y liso.
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", CALIDAD_JPEG),
  );
  if (!blob) throw new Error("toBlob fallo");
  return blob;
}

/** Baja un archivo con un <a download>. */
function bajar(archivo: File): void {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.name;
  a.click();
  // Safari de iOS empieza la descarga despues de este tick: revocar en el acto
  // puede cortarla.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Baja los archivos uno tras otro. La pausa evita que el navegador descarte
 * descargas seguidas; Chrome pide permiso una vez para "varios archivos".
 */
export async function descargarArchivos(archivos: File[]): Promise<void> {
  for (const [i, archivo] of archivos.entries()) {
    if (i > 0) await espera(400);
    bajar(archivo);
  }
}

/** Si el navegador puede compartir estos archivos (el telefono, sobre todo). */
export function puedeCompartir(archivos: File[]): boolean {
  try {
    return (
      typeof navigator.canShare === "function" && navigator.canShare({ files: archivos })
    );
  } catch {
    return false;
  }
}

/**
 * Abre la hoja de compartir del sistema con las imagenes. Tiene que llamarse
 * desde un clic: el navegador lo exige, y el de «Imagen» ya caduco mientras se
 * dibujaba. Si el usuario cierra la hoja no pasa nada; si el navegador se
 * niega, se descargan.
 */
export async function compartirArchivos(
  archivos: File[],
): Promise<"compartidas" | "descargadas" | "canceladas"> {
  try {
    await navigator.share({ files: archivos });
    return "compartidas";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "canceladas";
    await descargarArchivos(archivos);
    return "descargadas";
  }
}

/** Dibuja la plancha y la baja: la imagen de una baraja, siempre una pagina. */
export async function downloadCardSheet(p: Plancha): Promise<void> {
  await descargarArchivos(await generarPlancha(p));
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
