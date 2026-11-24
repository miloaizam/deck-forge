"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Coins, Eraser, Eye, Hand, Layers, Shuffle, TriangleAlert } from "lucide-react";

import { CardModal } from "../CardModal";
import { CaraOdorso } from "./CaraOdorso";
import { DialogoMarcas } from "./DialogoMarcas";
import { DialogoNumero } from "./DialogoNumero";
import { DialogoRevelado } from "./DialogoRevelado";
import { MarcadorTurno } from "./MarcadorTurno";
import { MenuMesa, type ItemMenu } from "./MenuMesa";
import { RegistroMesa } from "./RegistroMesa";
import { VentanaMesa } from "./VentanaMesa";
import type { Accion, ZonaBuscable } from "@/lib/mesa/apply";
import { avisos, MANO_MAXIMA } from "@/lib/mesa/avisos";
import { textoDeEntrada } from "@/lib/mesa/registro";
import {
  anfitriona,
  dependientes,
  enJuego,
  jugador as jugadorDe,
  ubicar,
  NOMBRE_ZONA,
  ZONA_CON_ARTICULO,
  ZONAS,
  type Jugador,
  type Mesa,
  type Zona,
} from "@/lib/mesa/table";
import { vista as vistaDe } from "@/lib/mesa/vista";
import type { Card, Formato } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO_COMPACTO,
  BOTON_SECUNDARIO_COMPACTO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * La mesa tiene un tamano LOGICO fijo y se escala a la ventana con CSS
 * (GAME.md §5): asi las cartas guardan sus proporciones en cualquier pantalla
 * de escritorio y las coordenadas del arrastre se calculan una sola vez.
 */
const ANCHO = 1600;
const ALTO = 790;
const CARTA_W = 100;
const CARTA_H = 143;
/** Alto del rotulo de cada zona, sobre las cartas. */
const ROTULO = 26;
/**
 * Con rival, su mitad va arriba: su mano en una franja de dorsos y sus tres
 * filas en espejo, con su Linea de Ataque frente a la propia (GAME.md §5).
 */
const MANO_RIVAL = 80;
const ALTO_RIVAL = 16 + MANO_RIVAL + 10 + 554;
const SEPARACION = 6;
const ALTO_DUO = ALTO_RIVAL + SEPARACION + ALTO;

interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Una pila muestra solo la de arriba; una fila, todas en linea. */
  forma: "fila" | "pila";
}

/**
 * Donde va cada zona, en coordenadas logicas, en el orden que pidio el
 * proyecto: tres columnas por tres filas y la mano abajo, a lo ancho.
 * Izquierda: Soporte, Cementerio y Destierro. Al medio: Oro Pagado, Castillo
 * y Reserva. A la derecha, ancha: las Lineas de Ataque, Defensa y Apoyo. La
 * de Ataque va arriba porque en el 1v1 queda frente a la del rival.
 */
const CAJAS: Record<Zona, Caja> = {
  soporte: { x: 16, y: 16, w: 230, h: 178, forma: "pila" },
  cementerio: { x: 16, y: 204, w: 230, h: 178, forma: "pila" },
  destierro: { x: 16, y: 392, w: 230, h: 178, forma: "pila" },
  oroPagado: { x: 256, y: 16, w: 230, h: 178, forma: "fila" },
  castillo: { x: 256, y: 204, w: 230, h: 178, forma: "pila" },
  reserva: { x: 256, y: 392, w: 230, h: 178, forma: "fila" },
  ataque: { x: 496, y: 16, w: 1088, h: 178, forma: "fila" },
  defensa: { x: 496, y: 204, w: 1088, h: 178, forma: "fila" },
  apoyo: { x: 496, y: 392, w: 1088, h: 178, forma: "fila" },
  mano: { x: 16, y: 580, w: 1568, h: 194, forma: "fila" },
};

/** Donde va una zona del rival: la propia en espejo, para que se miren. */
function cajaRival(zona: Zona): Caja {
  if (zona === "mano") return { x: 16, y: 16, w: 1568, h: MANO_RIVAL, forma: "fila" };
  const c = CAJAS[zona];
  return {
    ...c,
    x: ANCHO - c.x - c.w,
    y: 16 + MANO_RIVAL + 10 + (570 - c.y - c.h),
  };
}

/** El orden en que se ofrecen los destinos en «Mandar a». */
const DESTINOS: Zona[] = [
  "mano",
  "ataque",
  "defensa",
  "apoyo",
  "reserva",
  "oroPagado",
  "cementerio",
  "destierro",
  "castillo",
  "soporte",
];

/** Las zonas que se abren en una ventana para ver todas sus cartas. */
type ZonaRevisable = "cementerio" | "destierro" | "soporte";

interface Revisando {
  zona: ZonaRevisable;
  jugador: string;
}

/** Donde va la carta numero `i` de `n` en una fila de ancho `w`. */
function izquierdaEnFila(i: number, n: number, w: number): number {
  const libre = w - 16 - CARTA_W;
  const paso = n > 1 ? Math.min(CARTA_W + 8, libre / (n - 1)) : 0;
  return 8 + i * paso;
}

interface MenuAbierto {
  x: number;
  y: number;
  titulo: string;
  items: ItemMenu[];
}

/** Lo que pide cuantas cartas antes de hacerse, y sobre que Castillo. */
type TipoPedido = "botar" | "mirar" | "mostrar";
interface Pedido {
  tipo: TipoPedido;
  jugador: string;
}

const PEDIDO: Record<TipoPedido, { titulo: string; accion: string }> = {
  botar: { titulo: "¿Cuántas cartas botar?", accion: "Botar" },
  mirar: { titulo: "¿Cuántas cartas mirar?", accion: "Mirar" },
  mostrar: { titulo: "¿Cuántas cartas mostrar?", accion: "Mostrar" },
};

interface Arrastre {
  uid: string;
  pointerId: number;
  inicioX: number;
  inicioY: number;
  /** Donde va la carta fantasma, en coordenadas logicas. `null` hasta moverse. */
  x: number | null;
  y: number | null;
}

interface TableroMesaProps {
  /** La mesa como la conoce este navegador: lo que no sabe, con `cartaId: ""`. */
  mesa: Mesa;
  /** El jugador de este navegador. */
  yo: string;
  /** Cada gesto es una accion: quien usa el tablero decide que hacer con ella. */
  hacer: (accion: Accion) => void;
  cartas: Map<string, Card>;
  formato: Formato;
  /** El titulo y los botones de arriba (empezar de nuevo, cambiar de baraja…). */
  cabecera: ReactNode;
  /** Con rival: como se llama cada jugador, para el registro y los rotulos. */
  nombreJugador?: (id: string) => string;
  /** Algo mas sobre la mesa: el estado de la conexion en el 1v1. */
  aviso?: ReactNode;
}

/**
 * El tablero (GAME.md, sesiones 2, 3 y 5): lo usan la mesa de practica y la
 * del 1v1. No guarda la mesa: la recibe, y cada gesto es una `Accion` que
 * entrega a `hacer`. Se arrastra con eventos de puntero, sin libreria, y
 * todo lo que hace el arrastre tambien esta en el menu de cada carta, que es
 * lo que usa el teclado. Con rival, su mitad va arriba en espejo y sus
 * cartas, giradas.
 */
export function TableroMesa({
  mesa,
  yo: YO,
  hacer,
  cartas,
  formato,
  cabecera,
  nombreJugador,
  aviso,
}: TableroMesaProps) {
  const [menu, setMenu] = useState<MenuAbierto | null>(null);
  const [vista, setVista] = useState<Card | null>(null);
  const [revisando, setRevisando] = useState<Revisando | null>(null);
  /** Las cartas del Cementerio elegidas para barajar en el Castillo, o `null`. */
  const [barajando, setBarajando] = useState<string[] | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [marcasDe, setMarcasDe] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [escala, setEscala] = useState(1);

  const marco = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  /** El click que sigue a soltar un arrastre no tiene que abrir el menu. */
  const recienSoltada = useRef(false);

  const yo: Jugador = jugadorDe(mesa, YO) ?? mesa.jugadores[0];
  const rival: Jugador | null = mesa.jugadores.find((j) => j.id !== YO) ?? null;
  const rivalPresente = rival !== null;
  const altoTotal = rival ? ALTO_DUO : ALTO;
  /** Donde empieza la mitad propia: abajo si hay rival. */
  const desde = rival ? ALTO_RIVAL + SEPARACION : 0;
  const quien = (id: string) => nombreJugador?.(id) ?? (id === YO ? "Tú" : "Rival");
  /** Lo que este jugador ve: el Castillo y lo que no le toca, sin carta. */
  const visto = vistaDe(mesa, YO);
  const cartaDe = (uid: string): Card | undefined => {
    const id = visto.fichas[uid]?.cartaId;
    return id ? cartas.get(id) : undefined;
  };
  const nombre = (uid: string) => cartaDe(uid)?.nombre ?? "Carta";
  const texto = (e: Mesa["registro"][number]) =>
    textoDeEntrada(
      e,
      (id) => cartas.get(id)?.nombre ?? "una carta",
      rival ? quien : undefined,
      YO,
    );

  // La escala sale del ancho del marco y del alto que queda en la ventana.
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => {
      const alto = window.innerHeight - el.getBoundingClientRect().top - 16;
      const ancho = Math.min(el.clientWidth / ANCHO, 1.25);
      // Sola, la mesa cabe entera en la ventana. Con rival es casi el doble
      // de alta: llena el ancho y se recorre con el scroll, para que las
      // cartas no queden diminutas.
      setEscala(Math.max(0.3, rivalPresente ? ancho : Math.min(ancho, alto / altoTotal)));
    };
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [altoTotal, rivalPresente]);

  /** Las acciones de una carta: lo mismo que el arrastre, y algo mas. */
  function itemsDeCarta(uid: string): ItemMenu[] {
    const f = mesa.fichas[uid];
    const donde = ubicar(mesa, uid);
    const items: ItemMenu[] = [
      {
        etiqueta: "Ver carta",
        accion: () => setVista(cartaDe(uid) ?? null),
        deshabilitado: !cartaDe(uid),
      },
      {
        etiqueta: f.bocaAbajo ? "Poner boca arriba" : "Poner boca abajo",
        accion: () => hacer({ tipo: "voltear", uid }),
      },
      {
        etiqueta: "Marcas…",
        accion: () => setMarcasDe(uid),
      },
    ];
    if (f.portadaPor || f.debajoDe) {
      const raiz = ubicar(mesa, anfitriona(mesa, uid));
      if (raiz) {
        items.push({
          etiqueta: "Soltar",
          accion: () =>
            hacer({ tipo: "mover", uid, jugador: raiz.jugador.id, zona: raiz.zona }),
        });
      }
    }
    // En juego, a las zonas de su lado; fuera del juego va con su dueno igual.
    const lado = f.controlador;
    items.push({ separador: "Mandar a" });
    for (const zona of DESTINOS) {
      if (zona === donde?.zona) continue;
      if (zona === "castillo") {
        items.push(
          {
            etiqueta: "Arriba del Castillo",
            accion: () => hacer({ tipo: "mover", uid, jugador: lado, zona, posicion: 0 }),
          },
          {
            etiqueta: "Debajo del Castillo",
            accion: () =>
              hacer({ tipo: "mover", uid, jugador: lado, zona, posicion: Infinity }),
          },
        );
      } else {
        items.push({
          etiqueta: NOMBRE_ZONA[zona],
          accion: () => hacer({ tipo: "mover", uid, jugador: lado, zona }),
        });
      }
    }
    const colgadas = dependientes(mesa, uid);
    if (colgadas.length > 0) {
      items.push({ separador: "Anexadas y debajo" });
      for (const d of colgadas) {
        items.push({
          etiqueta: `${nombre(d.uid)}…`,
          accion: () => abrirMenuCarta(d.uid, menu?.x ?? 0, menu?.y ?? 0),
          mantiene: true,
        });
      }
    }
    return items;
  }

  function abrirMenuCarta(uid: string, x: number, y: number) {
    setMenu({ x, y, titulo: nombre(uid), items: itemsDeCarta(uid) });
  }

  function abrirMenuCastillo(x: number, y: number) {
    const vacio = yo.zonas.castillo.length === 0;
    setMenu({
      x,
      y,
      titulo: `Castillo (${yo.zonas.castillo.length})`,
      items: [
        {
          etiqueta: "Robar una",
          accion: () => hacer({ tipo: "robar", jugador: YO }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Botar…",
          accion: () => setPedido({ tipo: "botar", jugador: YO }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mirar…",
          accion: () => setPedido({ tipo: "mirar", jugador: YO }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mostrar…",
          accion: () => setPedido({ tipo: "mostrar", jugador: YO }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Buscar",
          accion: () => buscarEn("castillo", false),
        },
        {
          etiqueta: "Buscar y mostrar",
          accion: () => buscarEn("castillo", true),
        },
        {
          etiqueta: "Barajar",
          accion: () => hacer({ tipo: "barajar", jugador: YO }),
          deshabilitado: vacio,
        },
      ],
    });
  }

  /**
   * El Castillo del rival: lo que un efecto te deja hacerle. Lo hace su
   * navegador, al instante (GAME.md §2).
   */
  function abrirMenuCastilloRival(j: Jugador, x: number, y: number) {
    const vacio = j.zonas.castillo.length === 0;
    setMenu({
      x,
      y,
      titulo: `Castillo de ${quien(j.id)} (${j.zonas.castillo.length})`,
      items: [
        {
          etiqueta: "Botar…",
          accion: () => setPedido({ tipo: "botar", jugador: j.id }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mirar…",
          accion: () => setPedido({ tipo: "mirar", jugador: j.id }),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mostrar…",
          accion: () => setPedido({ tipo: "mostrar", jugador: j.id }),
          deshabilitado: vacio,
        },
      ],
    });
  }

  function buscarEn(zona: ZonaBuscable, mostrar: boolean) {
    setRevisando(null);
    setBarajando(null);
    hacer({ tipo: "abrirBusqueda", zona, mostrar });
  }

  /** De la pantalla a la mesa: el lienzo esta escalado. */
  function aLogico(clientX: number, clientY: number): { x: number; y: number } {
    const r = lienzo.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (clientX - r.left) / escala, y: (clientY - r.top) / escala };
  }

  function empezarArrastre(e: ReactPointerEvent<HTMLElement>, uid: string) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({
      uid,
      pointerId: e.pointerId,
      inicioX: e.clientX,
      inicioY: e.clientY,
      x: null,
      y: null,
    });
  }

  function moverArrastre(e: ReactPointerEvent<HTMLElement>) {
    if (!arrastre || e.pointerId !== arrastre.pointerId) return;
    const lejos =
      arrastre.x !== null ||
      Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) > 5;
    if (!lejos) return;
    const { x, y } = aLogico(e.clientX, e.clientY);
    setArrastre({ ...arrastre, x, y });
  }

  function terminarArrastre(e: ReactPointerEvent<HTMLElement>) {
    if (!arrastre || e.pointerId !== arrastre.pointerId) return;
    const { uid, x } = arrastre;
    setArrastre(null);
    if (x === null) return;
    // El click que sigue al pointerup llega en la misma tarea, si llega: la
    // carta suele cambiar de zona y desmontarse, y entonces no hay click.
    recienSoltada.current = true;
    setTimeout(() => (recienSoltada.current = false), 0);
    soltar(uid, e.clientX, e.clientY);
  }

  /** Donde cae una carta: sobre otra en juego, o en una zona. */
  function soltar(uid: string, clientX: number, clientY: number) {
    const debajo = document.elementsFromPoint(clientX, clientY);

    const datos = debajo.flatMap((el) => (el instanceof HTMLElement ? [el.dataset] : []));
    const sobreCarta = datos.map((d) => d.uid).find((otro) => otro && otro !== uid);
    if (sobreCarta) {
      const raiz = anfitriona(mesa, sobreCarta);
      const donde = ubicar(mesa, raiz);
      if (donde && enJuego(donde.zona) && anfitriona(mesa, raiz) !== uid) {
        const posicion = indiceEnFila(donde.jugador, donde.zona, clientX, uid);
        setMenu({
          x: clientX,
          y: clientY,
          titulo: `Sobre ${nombre(sobreCarta)}`,
          items: [
            {
              etiqueta: "Portar (anexar)",
              accion: () => hacer({ tipo: "portar", uid, portador: sobreCarta }),
            },
            {
              etiqueta: "Poner debajo",
              accion: () => hacer({ tipo: "ponerDebajo", uid, encima: sobreCarta }),
            },
            {
              etiqueta: "Dejar al lado",
              accion: () =>
                hacer({
                  tipo: "mover",
                  uid,
                  jugador: donde.jugador.id,
                  zona: donde.zona,
                  posicion,
                }),
            },
          ],
        });
        return;
      }
    }

    const dato = datos.find((d) => d.zona && d.jugador);
    const zona = ZONAS.find((z) => z === dato?.zona);
    const j = dato?.jugador ? jugadorDe(mesa, dato.jugador) : undefined;
    if (!zona || !j) return;
    hacer({
      tipo: "mover",
      uid,
      jugador: j.id,
      zona,
      posicion:
        CAJAS[zona].forma === "fila" ? indiceEnFila(j, zona, clientX, uid) : undefined,
    });
  }

  /** En que lugar de una fila cae la carta: cuantas quedan a su izquierda. */
  function indiceEnFila(j: Jugador, zona: Zona, clientX: number, sin: string): number {
    const lista = j.zonas[zona].filter((u) => u !== sin);
    let i = 0;
    for (const u of lista) {
      const el = lienzo.current?.querySelector<HTMLElement>(`[data-fila="${u}"]`);
      const r = el?.getBoundingClientRect();
      if (r && r.left + r.width / 2 < clientX) i++;
    }
    return i;
  }

  function alPulsarCarta(e: React.MouseEvent<HTMLElement>, uid: string) {
    if (recienSoltada.current) {
      recienSoltada.current = false;
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    abrirMenuCarta(uid, e.clientX || r.left + r.width / 2, e.clientY || r.top + 20);
  }

  function alMenuContextual(e: React.MouseEvent<HTMLElement>, uid: string) {
    e.preventDefault();
    abrirMenuCarta(uid, e.clientX, e.clientY);
  }

  // Lo que sigue son funciones de render y no componentes: un componente
  // declarado aqui dentro seria otro en cada render, y React desmontaria la
  // carta en pleno arrastre (y con ella la captura del puntero).

  /** Una carta en la mesa: su cara o su dorso, con lo que lleva colgado. */
  function fichaEnMesa(uid: string, izquierda: number, arriba: number, girada: boolean) {
    const f = mesa.fichas[uid];
    const card = cartaDe(uid);
    const colgadas = dependientes(mesa, uid).slice(0, 3);
    const arrastrada = arrastre?.uid === uid && arrastre.x !== null;
    const marcas = Object.entries(f.contadores);
    return (
      <div
        key={uid}
        // `isolate`: lo anexado va detras de la carta pero delante de la zona.
        className={cn("absolute isolate", arrastrada && "opacity-30")}
        style={{ left: izquierda, top: arriba, width: CARTA_W, height: CARTA_H }}
      >
        {colgadas.map((d, i) => (
          <div
            key={d.uid}
            data-uid={d.uid}
            aria-hidden="true"
            className="border-line absolute overflow-hidden rounded-[6px] border"
            style={{
              left: 8 * (i + 1),
              top: -6 * (i + 1),
              width: CARTA_W,
              height: CARTA_H,
              zIndex: -1 - i,
            }}
          >
            <span className={cn("block size-full", girada && "rotate-180")}>
              <CaraOdorso card={cartaDe(d.uid)} bocaAbajo={d.bocaAbajo} />
            </span>
          </div>
        ))}
        <button
          type="button"
          data-uid={uid}
          data-fila={uid}
          aria-label={`${f.bocaAbajo ? "Carta boca abajo" : (card?.nombre ?? "Carta")}${
            colgadas.length
              ? `, con ${colgadas.length} anexada${colgadas.length > 1 ? "s" : ""}`
              : ""
          }`}
          aria-haspopup="menu"
          onPointerDown={(e) => empezarArrastre(e, uid)}
          onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre}
          onPointerCancel={() => setArrastre(null)}
          onClick={(e) => alPulsarCarta(e, uid)}
          onContextMenu={(e) => alMenuContextual(e, uid)}
          className="border-line focus-visible:outline-brand-500 hover:outline-brand-500 relative block size-full cursor-grab touch-none overflow-hidden rounded-[6px] border hover:outline-2 hover:outline-offset-2 active:cursor-grabbing"
        >
          <span className={cn("block size-full", girada && "rotate-180")}>
            <CaraOdorso card={card} bocaAbajo={f.bocaAbajo} />
          </span>
        </button>
        {(marcas.length > 0 || f.fuerza !== 0) && (
          <div className="pointer-events-none absolute right-1 bottom-1 left-1 flex flex-wrap justify-end gap-0.5">
            {f.fuerza !== 0 && (
              <span className="bg-brand-600 rounded px-1 text-[11px] font-bold text-white tabular-nums">
                {f.fuerza > 0 ? `+${f.fuerza}` : f.fuerza}
              </span>
            )}
            {marcas.map(([c, n]) => (
              <span
                key={c}
                className="bg-panel text-ink rounded px-1 text-[11px] tabular-nums"
              >
                {c[0].toUpperCase()}
                {n}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  function zonaEnMesa(zona: Zona, j: Jugador, girada: boolean) {
    const base = girada ? cajaRival(zona) : CAJAS[zona];
    const caja = girada ? base : { ...base, y: base.y + desde };
    const lista = j.zonas[zona];
    const propia = j.id === YO;
    const rotulo = propia ? NOMBRE_ZONA[zona] : `${NOMBRE_ZONA[zona]} de ${quien(j.id)}`;
    const centro = (caja.w - CARTA_W) / 2;
    return (
      <section
        key={`${j.id}-${zona}`}
        aria-label={`${rotulo}, ${lista.length} ${lista.length === 1 ? "carta" : "cartas"}`}
        data-zona={zona}
        data-jugador={j.id}
        className={cn(
          "border-line absolute rounded-[10px] border",
          enJuego(zona) ? "bg-panel/60" : "bg-surface/60",
          arrastre?.x != null && "border-dashed",
        )}
        style={{ left: caja.x, top: caja.y, width: caja.w, height: caja.h }}
      >
        <p className="text-muted bg-panel/90 pointer-events-none absolute top-1 left-1.5 z-10 rounded px-1 text-[12px] font-bold tracking-[0.08em] uppercase">
          {rotulo}
          <span className="ml-1.5 font-normal tabular-nums">{lista.length}</span>
        </p>

        {/* La mano del rival: solo los dorsos, y cuantas son. */}
        {girada && zona === "mano"
          ? lista.map((uid, i) => (
              <div
                key={uid}
                aria-hidden="true"
                className="border-line absolute overflow-hidden rounded-[4px] border"
                style={{
                  left:
                    8 + i * Math.min(40, (caja.w - 60) / Math.max(1, lista.length - 1)),
                  top: ROTULO,
                  width: 36,
                  height: 51,
                }}
              >
                <CaraOdorso card={undefined} bocaAbajo />
              </div>
            ))
          : caja.forma === "fila" &&
            lista.map((uid, i) =>
              fichaEnMesa(
                uid,
                izquierdaEnFila(i, lista.length, caja.w),
                ROTULO + (caja.h - ROTULO - CARTA_H) / 2,
                girada,
              ),
            )}

        {caja.forma === "pila" && pila(zona, centro, j, girada)}
      </section>
    );
  }

  function pila(zona: Zona, izquierda: number, j: Jugador, girada: boolean) {
    const lista = j.zonas[zona];
    const propia = j.id === YO;
    const arriba = ROTULO + (CAJAS[zona].h - ROTULO - CARTA_H) / 2;
    const hueco = { left: izquierda, top: arriba, width: CARTA_W, height: CARTA_H };
    if (lista.length === 0) {
      return (
        <div
          aria-hidden="true"
          className="border-line absolute rounded-[6px] border border-dashed"
          style={hueco}
        />
      );
    }
    const tope = mesa.fichas[zona === "castillo" ? lista[0] : lista[lista.length - 1]];
    const oculta = zona === "castillo" || zona === "soporte";
    const cara = (
      <span className={cn("block size-full", girada && "rotate-180")}>
        <CaraOdorso card={cartaDe(tope.uid)} bocaAbajo={oculta || tope.bocaAbajo} />
      </span>
    );
    const grosor = lista.length > 1 ? "3px 3px 0 var(--color-line)" : undefined;
    // El Soporte del rival es suyo: se ve el monton y nada mas.
    if (!propia && zona === "soporte") {
      return (
        <div
          aria-hidden="true"
          className="border-line absolute overflow-hidden rounded-[6px] border"
          style={{ ...hueco, boxShadow: grosor }}
        >
          {cara}
        </div>
      );
    }
    const n = `${lista.length} ${lista.length === 1 ? "carta" : "cartas"}`;
    const etiqueta =
      zona === "castillo"
        ? propia
          ? `Castillo, ${n}: robar, botar, mirar, buscar o barajar`
          : `Castillo de ${quien(j.id)}, ${n}: botar, mirar o mostrar`
        : `Ver ${propia ? NOMBRE_ZONA[zona] : `${NOMBRE_ZONA[zona]} de ${quien(j.id)}`}, ${n}`;
    return (
      <button
        type="button"
        data-uid={zona === "castillo" ? undefined : tope.uid}
        aria-label={etiqueta}
        aria-haspopup={zona === "castillo" ? "menu" : "dialog"}
        onPointerDown={(e) => empezarArrastre(e, tope.uid)}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={() => setArrastre(null)}
        onClick={(e) => {
          if (recienSoltada.current) {
            recienSoltada.current = false;
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX || r.left + r.width / 2;
          const y = e.clientY || r.top + 20;
          if (zona === "castillo") {
            if (propia) abrirMenuCastillo(x, y);
            else abrirMenuCastilloRival(j, x, y);
          } else if (
            zona === "cementerio" ||
            zona === "destierro" ||
            zona === "soporte"
          ) {
            setRevisando({ zona, jugador: j.id });
          }
        }}
        className={cn(
          "border-line focus-visible:outline-brand-500 hover:outline-brand-500 absolute cursor-grab touch-none overflow-hidden rounded-[6px] border hover:outline-2 hover:outline-offset-2",
          arrastre?.uid === tope.uid && arrastre.x !== null && "opacity-30",
        )}
        // El grosor del monton se insinua con sombras apiladas.
        style={{ ...hueco, boxShadow: grosor }}
      >
        {cara}
      </button>
    );
  }

  const fantasma =
    arrastre && arrastre.x !== null && arrastre.y !== null ? arrastre : null;
  const revisada = revisando ? jugadorDe(mesa, revisando.jugador) : undefined;
  const listaRevisada = revisando && revisada ? revisada.zonas[revisando.zona] : [];
  const revisoLoMio = revisando?.jugador === YO;
  // Lo que esta mirando o buscando este jugador: solo quien lo abrio lo maneja.
  const revelado = mesa.revelado?.por === YO ? mesa.revelado : null;
  const fichaMarcas = marcasDe ? mesa.fichas[marcasDe] : null;
  const alertas = avisos(mesa, YO);
  // Lo que el rival esta haciendo con cartas que no se mueven: mostrarlas a
  // los dos, mirar tu Castillo o buscar en el suyo.
  const delRival = mesa.revelado && mesa.revelado.por !== YO ? mesa.revelado : null;
  const objetivoPedido = pedido ? jugadorDe(mesa, pedido.jugador) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {cabecera}
      {aviso}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MarcadorTurno
          turno={mesa.turno}
          onFase={(fase) => hacer({ tipo: "fase", fase })}
          onSiguiente={() => hacer({ tipo: "siguienteFase" })}
          onPasar={() => hacer({ tipo: "pasarTurno" })}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => hacer({ tipo: "robar", jugador: YO })}
            disabled={yo.zonas.castillo.length === 0}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Hand size={14} aria-hidden="true" />
            Robar una
          </button>
          <button
            type="button"
            onClick={() => hacer({ tipo: "barajar", jugador: YO })}
            disabled={yo.zonas.castillo.length === 0}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Shuffle size={14} aria-hidden="true" />
            Barajar
          </button>
          <button
            type="button"
            onClick={() => hacer({ tipo: "mulligan", jugador: YO })}
            disabled={yo.zonas.mano.length === 0}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Shuffle size={14} aria-hidden="true" />
            Mulligan
          </button>
          <button
            type="button"
            onClick={() => hacer({ tipo: "agrupar", jugador: YO })}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Layers size={14} aria-hidden="true" />
            Agrupar
          </button>
          <button
            type="button"
            onClick={() => hacer({ tipo: "limpiarTemporales" })}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Eraser size={14} aria-hidden="true" />
            Limpiar Fuerza
          </button>
          <button
            type="button"
            onClick={() => hacer({ tipo: "sortear" })}
            className={BOTON_SECUNDARIO_COMPACTO}
          >
            <Coins size={14} aria-hidden="true" />
            Lanzar moneda
          </button>
        </div>
      </div>

      {delRival && (
        <div role="status" className={cn(AVISO_EN_LINEA, "items-center")}>
          <Eye size={16} aria-hidden="true" className="text-accent" />
          {delRival.para === "todos" ? (
            <>
              <span>
                {quien(delRival.por)} muestra{" "}
                {delRival.uids.length === 1
                  ? "una carta"
                  : `${delRival.uids.length} cartas`}
                :
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {delRival.uids.map((uid) => (
                  <li
                    key={uid}
                    className="border-line w-14 overflow-hidden rounded-[4px] border"
                  >
                    <span className="sr-only">{nombre(uid)}</span>
                    <CaraOdorso card={cartaDe(uid)} bocaAbajo={false} />
                  </li>
                ))}
              </ul>
            </>
          ) : delRival.modo === "buscar" ? (
            <span>
              {quien(delRival.por)} está buscando en su {NOMBRE_ZONA[delRival.zona]}.
            </span>
          ) : (
            <span>
              {quien(delRival.por)} está mirando{" "}
              {delRival.uids.length === 1
                ? "la de arriba"
                : `las ${delRival.uids.length} de arriba`}{" "}
              de tu Castillo.
            </span>
          )}
        </div>
      )}

      {alertas.length > 0 && (
        <div
          role="alert"
          className={cn(AVISO_EN_LINEA, "border-warning/60 bg-warning-soft text-ink")}
        >
          <TriangleAlert size={16} aria-hidden="true" className="text-warning mt-0.5" />
          <ul className="flex flex-col gap-1">
            {alertas.map((a) => (
              <li key={a.tipo}>
                {a.tipo === "castillo-vacio"
                  ? "Castillo vacío: quien se queda sin cartas en el Castillo pierde el juego."
                  : `Mano de ${a.cartas} cartas: el máximo es ${MANO_MAXIMA}. Descarta las que sobren al Cementerio.`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div ref={marco} className="min-w-0" style={{ height: altoTotal * escala }}>
          <div
            ref={lienzo}
            className="bg-surface border-line rounded-panel relative origin-top-left border"
            style={{ width: ANCHO, height: altoTotal, transform: `scale(${escala})` }}
          >
            {rival && ZONAS.map((z) => zonaEnMesa(z, rival, true))}
            {ZONAS.map((z) => zonaEnMesa(z, yo, false))}

            {fantasma && (
              <div
                aria-hidden="true"
                className="border-brand-500 pointer-events-none absolute z-50 overflow-hidden rounded-[6px] border-2 shadow-2xl"
                style={{
                  left: (fantasma.x ?? 0) - CARTA_W / 2,
                  top: (fantasma.y ?? 0) - CARTA_H / 2,
                  width: CARTA_W,
                  height: CARTA_H,
                }}
              >
                <CaraOdorso
                  card={cartaDe(fantasma.uid)}
                  bocaAbajo={
                    mesa.fichas[fantasma.uid].bocaAbajo ||
                    ubicar(mesa, fantasma.uid)?.zona === "castillo"
                  }
                />
              </div>
            )}
          </div>
        </div>
        <RegistroMesa
          registro={mesa.registro}
          texto={texto}
          className="max-h-72 xl:max-h-none"
        />
      </div>

      {revisando && (
        <VentanaMesa
          titulo={`${revisoLoMio ? NOMBRE_ZONA[revisando.zona] : `${NOMBRE_ZONA[revisando.zona]} de ${quien(revisando.jugador)}`} (${listaRevisada.length})`}
          onCerrar={() => {
            setRevisando(null);
            setBarajando(null);
            setMenu(null);
          }}
        >
          {revisoLoMio && revisando.zona !== "destierro" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  revisando.zona !== "destierro" && buscarEn(revisando.zona, false)
                }
                className={BOTON_SECUNDARIO_COMPACTO}
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={() =>
                  revisando.zona !== "destierro" && buscarEn(revisando.zona, true)
                }
                className={BOTON_SECUNDARIO_COMPACTO}
              >
                Buscar y mostrar
              </button>
              {revisando.zona === "cementerio" &&
                (barajando === null ? (
                  <button
                    type="button"
                    onClick={() => setBarajando([])}
                    disabled={listaRevisada.length === 0}
                    className={BOTON_SECUNDARIO_COMPACTO}
                  >
                    <Shuffle size={14} aria-hidden="true" />
                    Elegir para barajar en el Castillo
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        hacer({
                          tipo: "barajarDesdeCementerio",
                          jugador: YO,
                          uids: barajando,
                        });
                        setBarajando(null);
                      }}
                      disabled={barajando.length === 0}
                      className={BOTON_PRIMARIO_COMPACTO}
                    >
                      <Shuffle size={14} aria-hidden="true" />
                      Barajar {barajando.length} en el Castillo
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarajando(null)}
                      className={BOTON_SECUNDARIO_COMPACTO}
                    >
                      Cancelar
                    </button>
                  </>
                ))}
            </div>
          )}
          {listaRevisada.length === 0 ? (
            <p className="text-muted mt-4 text-[14px]">No hay cartas.</p>
          ) : (
            <ul className="mt-4 grid max-h-[60vh] grid-cols-6 gap-2 overflow-y-auto p-1">
              {listaRevisada.map((uid) => {
                const card = cartaDe(uid);
                const elegida = barajando?.includes(uid) ?? false;
                return (
                  <li key={uid}>
                    <button
                      type="button"
                      aria-haspopup={barajando === null ? "menu" : undefined}
                      aria-pressed={barajando === null ? undefined : elegida}
                      onClick={(e) =>
                        barajando === null
                          ? abrirMenuCarta(uid, e.clientX, e.clientY)
                          : setBarajando(
                              elegida
                                ? barajando.filter((u) => u !== uid)
                                : [...barajando, uid],
                            )
                      }
                      className={cn(
                        "border-line focus-visible:outline-brand-500 hover:outline-brand-500 block w-full overflow-hidden rounded-[6px] border hover:outline-2 hover:outline-offset-2",
                        elegida && "outline-brand-500 outline-4 outline-offset-2",
                      )}
                    >
                      <span className="sr-only">{card?.nombre ?? "Carta"}</span>
                      <CaraOdorso card={card} bocaAbajo={false} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {menu && <MenuMesa {...menu} onCerrar={() => setMenu(null)} />}
        </VentanaMesa>
      )}

      {revelado && (
        <DialogoRevelado
          key={`${revelado.modo}-${revelado.zona}-${revelado.uids.join(",")}`}
          modo={revelado.modo}
          mostrar={revelado.mostrar}
          donde={ZONA_CON_ARTICULO[revelado.zona]}
          cartas={revelado.uids.map((uid) => ({ uid, card: cartaDe(uid) }))}
          onOrdenar={(uids) => hacer({ tipo: "ordenarTope", uids })}
          onDejar={() => hacer({ tipo: "cerrarRevelado" })}
          onTomar={(uid) => hacer({ tipo: "buscar", uid })}
        />
      )}

      {pedido && objetivoPedido && (
        <DialogoNumero
          titulo={
            pedido.jugador === YO
              ? PEDIDO[pedido.tipo].titulo
              : `${PEDIDO[pedido.tipo].titulo.replace("?", "")} del Castillo de ${quien(pedido.jugador)}?`
          }
          accion={PEDIDO[pedido.tipo].accion}
          maximo={objetivoPedido.zonas.castillo.length}
          onAceptar={(n) =>
            hacer(
              pedido.tipo === "botar"
                ? { tipo: "botar", jugador: pedido.jugador, n }
                : { tipo: pedido.tipo, jugador: pedido.jugador, n },
            )
          }
          onCerrar={() => setPedido(null)}
        />
      )}

      {fichaMarcas && marcasDe && (
        <DialogoMarcas
          nombre={nombre(marcasDe)}
          ficha={fichaMarcas}
          hacer={hacer}
          onCerrar={() => setMarcasDe(null)}
        />
      )}

      {menu && !revisando && <MenuMesa {...menu} onCerrar={() => setMenu(null)} />}

      <CardModal card={vista} onClose={() => setVista(null)} formato={formato} />
    </div>
  );
}
