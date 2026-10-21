import { cn } from "./utils";

/**
 * Proporcion real del arte de las cartas MyL: 512 x 732. Vive aqui y no en
 * CardTile.tsx para que importarla no arrastre al componente: `Skeleton.tsx`
 * la usa, y por la ayuda de la navbar terminaba metiendo zod y las erratas en
 * el JavaScript de todas las paginas.
 */
export const CARD_RATIO = "512 / 732";

/**
 * Clases compartidas entre componentes, para lo que tiene que verse igual en
 * toda la app y se escribia suelto en cada archivo.
 *
 * Sin "use client" a proposito: es un string, y una constante exportada desde
 * un modulo de cliente le llega a un Server Component como referencia, no como
 * valor (mismo motivo por el que THEME_KEY vive en theme.ts).
 */

/**
 * Campo de texto de una linea: el buscador del catalogo y el nombre de la baraja.
 *
 * Van juntos porque en /constructor se ven uno al lado del otro: el nombre del
 * baraja llevaba `bg-surface` y quedaba hundido contra el panel, mientras el
 * buscador iba en `bg-panel`. Para el icono del buscador basta sobrescribir el
 * padding con cn(), que resuelve el conflicto con twMerge.
 */
export const TEXT_FIELD =
  "border-line bg-panel text-ink placeholder:text-muted focus-visible:outline-brand-500 rounded-chip h-11 w-full border px-3 text-sm";

/**
 * El nombre de la baraja en /constructor: la misma caja del buscador, mas cuadrada y
 * mas alta, que es lo primero del panel y conviene que pese.
 *
 * El fondo lo pone quien lo usa: en el panel de escritorio va `bg-surface`
 * sobre el panel, y en la hoja del movil se queda con el `bg-panel` de aqui
 * sobre la hoja. En los dos casos el campo contrasta con lo que tiene detras.
 *
 * `shrink-0` no es decorativo: en el panel es un hijo de un flex en columna, y
 * en cuanto la baraja tiene cartas suficientes para desbordar, el navegador
 * aplasta los items que pueden encogerse. El campo pasaba de 48px a 20 en
 * cuanto se empezaba a armar la baraja, que es justo cuando se usa.
 */
export const DECK_NAME_FIELD = cn(TEXT_FIELD, "h-12 shrink-0 rounded-md text-[15px]");

/**
 * La descripcion de la baraja: la misma caja del nombre, de dos lineas y con
 * la MISMA letra. Iba a 13px, de pie de foto, y justo debajo del nombre a 14
 * se leia como un descuido: dos placeholders de tamano distinto uno sobre
 * otro. Sale de DECK_NAME_FIELD para que no vuelvan a separarse.
 *
 * `resize-none` porque el alto lo fija `rows`: un textarea estirable dentro de
 * un panel que ya scrollea confunde mas que ayuda.
 */
export const DECK_NOTE_FIELD = cn(
  DECK_NAME_FIELD,
  "h-auto shrink-0 resize-none rounded-md py-2.5 leading-snug",
);

/**
 * Boton principal de una pantalla suelta (portada, errores): alto, violeta y
 * con brillo, porque es la unica salida que se le ofrece al usuario.
 */
export const PRIMARY_BUTTON =
  "bg-brand-600 hover:bg-brand-500 shadow-glow focus-visible:outline-brand-500 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 px-8 text-[17px] font-medium text-white transition duration-200 hover:-translate-y-0.5";

/**
 * Su acompanante: mismo tamano y sin color, para que al lado del principal
 * quede claro cual es la salida recomendada.
 */
export const SECONDARY_BUTTON =
  "border-line text-ink hover:outline-2 hover:outline-offset-2 hover:outline-brand-500 focus-visible:outline-brand-500 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 border px-8 text-[17px] font-medium transition duration-200";

/**
 * Las clases van escritas enteras y no armadas con plantillas: Tailwind lee el
 * codigo tal cual y una clase construida en tiempo de ejecucion no se genera.
 *
 * Las usan la grilla (CardGrid) y su esqueleto de carga (Skeleton). Viven aqui y
 * no en CardGrid porque ese modulo es de cliente: importado desde un Server
 * Component entregaria una referencia, no el valor (CLAUDE.md, THEME_KEY).
 */
export const COLUMNAS_GRILLA: Record<"catalogo" | "constructor", string> = {
  catalogo:
    "max-w-[200px] min-w-0 basis-[calc((100%-1rem)/2-0.5px)] sm:basis-[calc((100%-2rem)/3-0.5px)] md:basis-[calc((100%-3rem)/4-0.5px)] lg:basis-[calc((100%-4rem)/5-0.5px)] xl:basis-[calc((100%-6rem)/7-0.5px)]",
  constructor:
    "max-w-[200px] min-w-0 basis-[calc((100%-1rem)/2-0.5px)] sm:basis-[calc((100%-2rem)/3-0.5px)] md:basis-[calc((100%-3rem)/4-0.5px)] lg:basis-[calc((100%-3rem)/4-0.5px)] xl:basis-[calc((100%-5rem)/6-0.5px)]",
};

/**
 * El color de lo que se pierde. Lo que borra o vacia y no tiene vuelta atras
 * (borrar una baraja, vaciarla, vaciar la coleccion) se pone rojo al pasar el
 * cursor; lo que descarta algo menos grave (un borrador, una carta de la
 * lista de faltantes) se pone ambar. Se suman al final de la clase del boton:
 * `cn()` resuelve el choque con el hover violeta de siempre.
 */
export const HOVER_PELIGRO =
  "hover:outline-2 hover:outline-offset-2 hover:outline-danger hover:bg-danger/10 hover:text-danger";
export const HOVER_AVISO =
  "hover:outline-2 hover:outline-offset-2 hover:outline-warning hover:bg-warning/10 hover:text-warning";

/**
 * El contorno de una carta al apuntarla: un anillo violeta separado del borde
 * y la carta que sube un poco. Es el mismo en todo el sitio (catalogo,
 * constructor, la mesa de /baraja, la mano de prueba) para que el usuario lo
 * reconozca: dice sobre que carta va a caer el clic. Es `outline` y no el
 * borde para que no cambie de grosor la carta ni choque con su marco.
 *
 * `CONTORNO_CARTA` reacciona al propio elemento; `CONTORNO_CARTA_GRUPO`, al
 * `group` que lo envuelve, para cuando la carta comparte celda con botones
 * que no son ella (la estrella de portada en /baraja).
 */
const CONTORNO_BASE =
  "ease-out-soft rounded-card outline-2 outline-offset-2 outline-transparent transition-[translate,outline-color] duration-200";
export const CONTORNO_CARTA = `${CONTORNO_BASE} hover:outline-brand-500 hover:-translate-y-1 has-focus-visible:outline-brand-500 has-focus-visible:-translate-y-1`;
export const CONTORNO_CARTA_GRUPO = `${CONTORNO_BASE} group-hover:outline-brand-500 group-hover:-translate-y-1 group-has-focus-visible:outline-brand-500 group-has-focus-visible:-translate-y-1`;

/* ------------------------------------------------------------------ *
 * Botones. Un solo juego para todo el sitio (DESIGN.md, "Componentes").
 *
 * Reglas comunes:
 * - Al apuntar sale el ANILLO violeta (el mismo del foco del teclado); el
 *   borde no cambia. Lo que borra o vacia suma HOVER_PELIGRO, lo que descarta
 *   algo menos grave HOVER_AVISO: cambian el color del anillo.
 * - Texto de 13 px; iconos de 14 en botones con texto y 16 en los de icono.
 * - Deshabilitado (`disabled`): opacidad 40 y sin eventos. Bloqueado con
 *   `aria-disabled` (se pulsa y un aviso dice por que no): `BLOQUEADO`.
 * - Alto de 44 px. Donde no cabe (filas, tarjetas) va COMPACTO: la caja se
 *   ve de 36 y AREA_TACTIL estira lo que se pulsa hasta 44.
 *
 * Van como strings enteros y no armados en tiempo de ejecucion: Tailwind lee
 * el codigo tal cual y una clase construida no se genera.
 * ------------------------------------------------------------------ */

/** El anillo de hover y de foco de todo lo que se pulsa. */
export const ANILLO =
  "hover:outline-2 hover:outline-offset-2 hover:outline-brand-500 focus-visible:outline-brand-500";

/**
 * Agranda lo que se pulsa sin agrandar lo que se ve: un pseudo-elemento 4 px
 * mas grande hacia cada lado (36 + 8 = 44). Necesita `relative` en el boton.
 */
export const AREA_TACTIL = "relative after:absolute after:-inset-1 after:content-['']";

const CAJA =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-chip text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40";

/** La accion principal de una vista: violeta lleno. */
export const BOTON_PRIMARIO = `${CAJA} h-11 px-4 font-medium bg-brand-600 text-white hover:bg-brand-500 ${ANILLO}`;

/** El resto de las acciones: contorno gris, texto apagado que se aclara. */
export const BOTON_SECUNDARIO = `${CAJA} h-11 px-4 border border-line text-muted hover:text-ink ${ANILLO}`;

/**
 * Una accion destacada pero no principal, dentro de un panel violeta suave
 * («Usar este arte en la baraja»): se llena al apuntarla.
 */
export const BOTON_SUAVE = `${CAJA} min-h-11 px-3 py-2 font-medium border border-brand-500 bg-accent-soft text-accent hover:bg-brand-600 hover:text-white ${ANILLO}`;

/** Boton de solo icono, con borde: acciones de una baraja, menu, volver arriba. */
export const BOTON_ICONO = `${CAJA} size-11 border border-line text-muted hover:text-ink ${ANILLO}`;

/** Boton de solo icono sin borde: cerrar, ordenar, tema, ayuda. */
export const BOTON_ICONO_LIBRE = `${CAJA} size-11 text-muted hover:text-ink ${ANILLO}`;

/** Las versiones compactas, para filas y tarjetas: se ven de 36, se pulsan de 44. */
export const BOTON_PRIMARIO_COMPACTO = `${CAJA} ${AREA_TACTIL} h-9 px-3 font-medium bg-brand-600 text-white hover:bg-brand-500 ${ANILLO}`;
export const BOTON_SECUNDARIO_COMPACTO = `${CAJA} ${AREA_TACTIL} h-9 px-3 border border-line text-muted hover:text-ink ${ANILLO}`;
export const BOTON_ICONO_COMPACTO = `${CAJA} ${AREA_TACTIL} size-9 border border-line text-muted hover:text-ink ${ANILLO}`;
export const BOTON_ICONO_LIBRE_COMPACTO = `${CAJA} ${AREA_TACTIL} size-9 text-muted hover:text-ink ${ANILLO}`;

/** Un control bloqueado con `aria-disabled`: atenuado y con el cursor que lo dice. */
export const BLOQUEADO = "text-muted/40 cursor-not-allowed hover:text-muted/40";

/**
 * Dos o mas opciones excluyentes en una cinta: «Agregar a: Baraja / Side
 * deck» y las pestanas de la coleccion. El grupo lleva `role="group"` y cada
 * opcion `aria-pressed`.
 *
 * El anillo va HACIA ADENTRO (`-outline-offset-2`): la cinta puede scrollear
 * en el telefono, y su `overflow` recortaria uno hacia afuera. La cinta mide
 * 44 de alto con su padding, asi que cada opcion de 36 ya tiene su area.
 */
export const SEGMENTOS =
  "border-line bg-panel rounded-card inline-flex max-w-full gap-1 overflow-x-auto border p-1";
export const SEGMENTO =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-chip px-3.5 text-[13px] whitespace-nowrap transition-colors hover:outline-2 hover:-outline-offset-2 hover:outline-brand-500 focus-visible:-outline-offset-2 focus-visible:outline-brand-500";
export const SEGMENTO_ACTIVO = "bg-brand-600 font-medium text-white";
export const SEGMENTO_INACTIVO = "text-muted hover:text-ink";

/** Un enlace de texto que hace de accion: «Limpiar los filtros», «Ver mis barajas». */
export const ENLACE =
  "text-accent focus-visible:outline-brand-500 rounded underline underline-offset-4 transition-opacity hover:opacity-75";

/* ------------------------------------------------------------------ *
 * Contenedores y pastillas
 * ------------------------------------------------------------------ */

/**
 * Un aviso en linea con acciones, que se queda hasta que se decide: el del
 * borrador y el de la coleccion compartida.
 */
export const AVISO_EN_LINEA =
  "aparece border-brand-500/50 bg-accent-soft rounded-card flex flex-wrap items-start gap-3 border p-3.5 text-[13px]";

/** El estado vacio de una lista: caja punteada con un titulo y una salida. */
export const VACIO =
  "border-line rounded-panel border border-dashed px-6 py-16 text-center";

/** Una etiqueta chica de texto: estado de una baraja, tipo de novedad, tipo de carta. */
export const PASTILLA =
  "rounded-chip inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[12px] font-medium";

/** Un numero sobre violeta: filtros puestos, cartas de una seccion, erratas. */
export const CONTADOR =
  "bg-brand-600 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white tabular-nums";

/** El tono de una accion que se confirma en un modal. */
export type TonoAccion = "peligro" | "aviso" | "normal";

/**
 * El boton que confirma en un modal: rojo si la accion no tiene vuelta atras,
 * ambar si se puede rehacer, violeta si no pierde nada (bajar o compartir). El texto del hover va en `text-bg`, el fondo de
 * la pagina, que contrasta con el relleno en los dos temas.
 */
export const BOTON_CONFIRMAR: Record<TonoAccion, string> = {
  peligro:
    "border-danger bg-danger/15 text-danger hover:bg-danger hover:text-bg hover:outline-danger focus-visible:outline-danger",
  aviso:
    "border-warning bg-warning-soft text-warning hover:bg-warning hover:text-bg hover:outline-warning focus-visible:outline-warning",
  normal:
    "border-brand-600 bg-brand-600 text-white hover:bg-brand-500 hover:text-white hover:outline-brand-500 focus-visible:outline-brand-500",
};
