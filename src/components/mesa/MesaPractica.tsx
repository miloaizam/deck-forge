"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeftRight,
  Coins,
  Eraser,
  Hand,
  Layers,
  RotateCcw,
  Shuffle,
  TriangleAlert,
} from "lucide-react";

import { CardModal } from "../CardModal";
import { CaraOdorso } from "./CaraOdorso";
import { DialogoMarcas } from "./DialogoMarcas";
import { DialogoNumero } from "./DialogoNumero";
import { DialogoRevelado } from "./DialogoRevelado";
import { MarcadorTurno } from "./MarcadorTurno";
import { MenuMesa, type ItemMenu } from "./MenuMesa";
import { RegistroMesa } from "./RegistroMesa";
import { VentanaMesa } from "./VentanaMesa";
import { deckTitle } from "@/lib/deck";
import { apply, type Accion, type ZonaBuscable } from "@/lib/mesa/apply";
import { avisos, MANO_MAXIMA } from "@/lib/mesa/avisos";
import { textoDeEntrada } from "@/lib/mesa/registro";
import { newTable } from "@/lib/mesa/setup";
import {
  anfitriona,
  dependientes,
  enJuego,
  ubicar,
  NOMBRE_ZONA,
  ZONA_CON_ARTICULO,
  ZONAS,
  type Mesa,
  type Zona,
} from "@/lib/mesa/table";
import { vista as vistaDe } from "@/lib/mesa/vista";
import type { Card, Deck } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO_COMPACTO,
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_COMPACTO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

/** El unico jugador de la practica. */
const YO = "yo";

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

/** Lo que pide cuantas cartas antes de hacerse. */
type Pedido = "botar" | "mirar" | "mostrar";

const PEDIDO: Record<Pedido, { titulo: string; accion: string }> = {
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

interface MesaPracticaProps {
  deck: Deck;
  cartas: Map<string, Card>;
  onCambiarBaraja: () => void;
}

/**
 * La mesa de practica (GAME.md, sesion 2). El estado es una `Mesa` de
 * `src/lib/mesa/` y cada gesto es una `Accion` que pasa por `apply`: esta
 * vista no mueve cartas por su cuenta. Se arrastra con eventos de puntero,
 * sin libreria, y todo lo que hace el arrastre tambien esta en el menu de
 * cada carta, que es lo que usa el teclado.
 */
export function MesaPractica({ deck, cartas, onCambiarBaraja }: MesaPracticaProps) {
  const [mesa, setMesa] = useState<Mesa>(() => newTable([{ id: YO, deck }]));
  const [menu, setMenu] = useState<MenuAbierto | null>(null);
  const [vista, setVista] = useState<Card | null>(null);
  const [revisando, setRevisando] = useState<ZonaRevisable | null>(null);
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

  const hacer = useCallback((accion: Accion) => setMesa((m) => apply(m, accion)), []);
  const yo = mesa.jugadores[0];
  /** Lo que este jugador ve: el Castillo y lo que no le toca, sin carta. */
  const visto = vistaDe(mesa, YO);
  const cartaDe = (uid: string): Card | undefined => {
    const id = visto.fichas[uid]?.cartaId;
    return id ? cartas.get(id) : undefined;
  };
  const nombre = (uid: string) => cartaDe(uid)?.nombre ?? "Carta";
  const texto = (e: Mesa["registro"][number]) =>
    textoDeEntrada(e, (id) => cartas.get(id)?.nombre ?? "una carta");

  // La escala sale del ancho del marco y del alto que queda en la ventana.
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => {
      const alto = window.innerHeight - el.getBoundingClientRect().top - 16;
      setEscala(Math.max(0.3, Math.min(el.clientWidth / ANCHO, alto / ALTO, 1.25)));
    };
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

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
          accion: () => hacer({ tipo: "mover", uid, jugador: YO, zona: raiz.zona }),
        });
      }
    }
    items.push({ separador: "Mandar a" });
    for (const zona of DESTINOS) {
      if (zona === donde?.zona) continue;
      if (zona === "castillo") {
        items.push(
          {
            etiqueta: "Arriba del Castillo",
            accion: () => hacer({ tipo: "mover", uid, jugador: YO, zona, posicion: 0 }),
          },
          {
            etiqueta: "Debajo del Castillo",
            accion: () =>
              hacer({ tipo: "mover", uid, jugador: YO, zona, posicion: Infinity }),
          },
        );
      } else {
        items.push({
          etiqueta: NOMBRE_ZONA[zona],
          accion: () => hacer({ tipo: "mover", uid, jugador: YO, zona }),
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
          accion: () => setPedido("botar"),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mirar…",
          accion: () => setPedido("mirar"),
          deshabilitado: vacio,
        },
        {
          etiqueta: "Mostrar…",
          accion: () => setPedido("mostrar"),
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
        const posicion = indiceEnFila(donde.zona, clientX, uid);
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
                hacer({ tipo: "mover", uid, jugador: YO, zona: donde.zona, posicion }),
            },
          ],
        });
        return;
      }
    }

    const zona = ZONAS.find((z) => datos.some((d) => d.zona === z));
    if (!zona) return;
    hacer({
      tipo: "mover",
      uid,
      jugador: YO,
      zona,
      posicion:
        CAJAS[zona].forma === "fila" ? indiceEnFila(zona, clientX, uid) : undefined,
    });
  }

  /** En que lugar de una fila cae la carta: cuantas quedan a su izquierda. */
  function indiceEnFila(zona: Zona, clientX: number, sin: string): number {
    const lista = yo.zonas[zona].filter((u) => u !== sin);
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
  function fichaEnMesa(uid: string, izquierda: number, arriba: number) {
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
            <CaraOdorso card={cartaDe(d.uid)} bocaAbajo={d.bocaAbajo} />
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
          <CaraOdorso card={card} bocaAbajo={f.bocaAbajo} />
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

  function zonaEnMesa(zona: Zona) {
    const caja = CAJAS[zona];
    const lista = yo.zonas[zona];
    const centro = (caja.w - CARTA_W) / 2;
    return (
      <section
        key={zona}
        aria-label={`${NOMBRE_ZONA[zona]}, ${lista.length} ${lista.length === 1 ? "carta" : "cartas"}`}
        data-zona={zona}
        className={cn(
          "border-line absolute rounded-[10px] border",
          enJuego(zona) ? "bg-panel/60" : "bg-surface/60",
          arrastre?.x != null && "border-dashed",
        )}
        style={{ left: caja.x, top: caja.y, width: caja.w, height: caja.h }}
      >
        <p className="text-muted bg-panel/90 pointer-events-none absolute top-1 left-1.5 z-10 rounded px-1 text-[12px] font-bold tracking-[0.08em] uppercase">
          {NOMBRE_ZONA[zona]}
          <span className="ml-1.5 font-normal tabular-nums">{lista.length}</span>
        </p>

        {caja.forma === "fila" &&
          lista.map((uid, i) =>
            fichaEnMesa(
              uid,
              izquierdaEnFila(i, lista.length, caja.w),
              ROTULO + (caja.h - ROTULO - CARTA_H) / 2,
            ),
          )}

        {caja.forma === "pila" && pila(zona, centro)}
      </section>
    );
  }

  function pila(zona: Zona, izquierda: number) {
    const lista = yo.zonas[zona];
    const arriba = ROTULO + (CAJAS[zona].h - ROTULO - CARTA_H) / 2;
    if (lista.length === 0) {
      return (
        <div
          aria-hidden="true"
          className="border-line absolute rounded-[6px] border border-dashed"
          style={{ left: izquierda, top: arriba, width: CARTA_W, height: CARTA_H }}
        />
      );
    }
    const tope = mesa.fichas[zona === "castillo" ? lista[0] : lista[lista.length - 1]];
    const oculta = zona === "castillo" || zona === "soporte";
    const etiqueta =
      zona === "castillo"
        ? `Castillo, ${lista.length} cartas: robar, botar, mirar, buscar o barajar`
        : `Ver ${NOMBRE_ZONA[zona]}, ${lista.length} ${lista.length === 1 ? "carta" : "cartas"}`;
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
          if (zona === "castillo") {
            const r = e.currentTarget.getBoundingClientRect();
            abrirMenuCastillo(e.clientX || r.left + r.width / 2, e.clientY || r.top + 20);
          } else if (
            zona === "cementerio" ||
            zona === "destierro" ||
            zona === "soporte"
          ) {
            setRevisando(zona);
          }
        }}
        className={cn(
          "border-line focus-visible:outline-brand-500 hover:outline-brand-500 absolute cursor-grab touch-none overflow-hidden rounded-[6px] border hover:outline-2 hover:outline-offset-2",
          arrastre?.uid === tope.uid && arrastre.x !== null && "opacity-30",
        )}
        style={{
          left: izquierda,
          top: arriba,
          width: CARTA_W,
          height: CARTA_H,
          // El grosor del monton se insinua con sombras apiladas.
          boxShadow: lista.length > 1 ? "3px 3px 0 var(--color-line)" : undefined,
        }}
      >
        <CaraOdorso card={cartaDe(tope.uid)} bocaAbajo={oculta || tope.bocaAbajo} />
      </button>
    );
  }

  const fantasma =
    arrastre && arrastre.x !== null && arrastre.y !== null ? arrastre : null;
  const listaRevisada = revisando ? yo.zonas[revisando] : [];
  // Lo que esta mirando o buscando este jugador: solo quien lo abrio lo maneja.
  const revelado = mesa.revelado?.por === YO ? mesa.revelado : null;
  const fichaMarcas = marcasDe ? mesa.fichas[marcasDe] : null;
  const alertas = avisos(mesa, YO);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-ink mr-auto truncate text-lg font-bold">
          Práctica: {deckTitle(deck)}
        </h1>
        <p className="text-muted text-[13px] tabular-nums">
          Mano {yo.zonas.mano.length} · Castillo {yo.zonas.castillo.length}
        </p>
        <button
          type="button"
          onClick={() => setMesa(newTable([{ id: YO, deck }]))}
          className={BOTON_SECUNDARIO}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Empezar de nuevo
        </button>
        <button type="button" onClick={onCambiarBaraja} className={BOTON_SECUNDARIO}>
          <ArrowLeftRight size={14} aria-hidden="true" />
          Cambiar de baraja
        </button>
      </div>

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
        <div ref={marco} className="min-w-0" style={{ height: ALTO * escala }}>
          <div
            ref={lienzo}
            className="bg-surface border-line rounded-panel relative origin-top-left border"
            style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})` }}
          >
            {ZONAS.map(zonaEnMesa)}

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
          titulo={`${NOMBRE_ZONA[revisando]} (${listaRevisada.length})`}
          onCerrar={() => {
            setRevisando(null);
            setBarajando(null);
            setMenu(null);
          }}
        >
          {revisando !== "destierro" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => buscarEn(revisando, false)}
                className={BOTON_SECUNDARIO_COMPACTO}
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={() => buscarEn(revisando, true)}
                className={BOTON_SECUNDARIO_COMPACTO}
              >
                Buscar y mostrar
              </button>
              {revisando === "cementerio" &&
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

      {pedido && (
        <DialogoNumero
          titulo={PEDIDO[pedido].titulo}
          accion={PEDIDO[pedido].accion}
          maximo={yo.zonas.castillo.length}
          onAceptar={(n) =>
            hacer(
              pedido === "botar"
                ? { tipo: "botar", jugador: YO, n }
                : { tipo: pedido, jugador: YO, n },
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

      <CardModal card={vista} onClose={() => setVista(null)} formato={deck.formato} />
    </div>
  );
}
