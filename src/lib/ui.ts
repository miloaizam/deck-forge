import { cn } from "./utils";

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
  "bg-brand-600 hover:bg-brand-500 shadow-glow focus-visible:outline-brand-300 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 px-8 text-[17px] font-medium text-white transition duration-200 hover:-translate-y-0.5";

/**
 * Su acompanante: mismo tamano y sin color, para que al lado del principal
 * quede claro cual es la salida recomendada.
 */
export const SECONDARY_BUTTON =
  "border-line text-ink hover:border-brand-500 focus-visible:outline-brand-500 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 border px-8 text-[17px] font-medium transition duration-200";

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
  "hover:border-danger/70 hover:bg-danger/10 hover:text-danger";
export const HOVER_AVISO =
  "hover:border-warning/70 hover:bg-warning/10 hover:text-warning";

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

/** El tono de una accion que se confirma en un modal. */
export type TonoAccion = "peligro" | "aviso";

/**
 * El boton que confirma en un modal: rojo si la accion no tiene vuelta atras,
 * ambar si se puede rehacer. El texto del hover va en `text-bg`, el fondo de
 * la pagina, que contrasta con el relleno en los dos temas.
 */
export const BOTON_CONFIRMAR: Record<TonoAccion, string> = {
  peligro:
    "border-danger bg-danger/15 text-danger hover:bg-danger hover:text-bg focus-visible:outline-danger",
  aviso:
    "border-warning bg-warning/15 text-warning hover:bg-warning hover:text-bg focus-visible:outline-warning",
};
