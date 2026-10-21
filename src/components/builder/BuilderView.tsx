"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";

import { DeckClearButton, DeckPanel } from "./DeckPanel";
import { DeckParamLoader, type DraftState } from "./DeckParamLoader";
import { DraftNotice } from "./DraftNotice";
import { DeckSheet } from "./DeckSheet";
import { DeckIssues, estadoDeBaraja } from "../decks/DeckIssues";
import { ConfirmDialog } from "../ConfirmDialog";
import { AutoHeight } from "../AutoHeight";
import { CardGrid } from "../CardGrid";
import { CardModal } from "../CardModal";
import { Filters } from "../Filters";
import { Pagination } from "../Pagination";
import { CardGridSkeleton, Skeleton } from "../Skeleton";
import { toast } from "../toast";
import { useCatalogo } from "../use-catalogo";
import { useDecks } from "../decks/use-decks";
import {
  applyFilters,
  buildFacets,
  buildSearchIndex,
  EMPTY_FILTERS,
  hasActiveFilters,
  pageCount,
  pageRange,
  paginate,
  PAGE_SIZE_BUILDER,
  type CatalogFilters,
  type Facets,
} from "@/lib/catalog";
import {
  addCard,
  clearDeck,
  copiesOf,
  createDeck,
  deckTitle,
  describeDeck,
  removeCard,
  renameDeck,
  setQuantity,
  setStartingGold,
  swapPrinting,
  type DeckZone,
} from "@/lib/deck";
import {
  admite,
  affinityAdmits,
  affinityLabel,
  buildCardIndex,
  canAdd,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
  SIDE_TOTAL,
  type DeckIssue,
} from "@/lib/deck-rules";
import { agruparImpresiones, ordenarCartas } from "@/lib/card-order";
import { clearDraft, hayCambios, writeDraft } from "@/lib/deck-draft";
import {
  mensajeNoGuardada,
  nombreOcupado,
  readDeck,
  readDecks,
  saveDeck,
} from "@/lib/deck-storage";
import {
  MAX_DESCRIPCION_BARAJA,
  MAX_NOMBRE_BARAJA,
  type Card,
  type Deck,
} from "@/lib/types";
import {
  BOTON_PRIMARIO,
  DECK_NAME_FIELD,
  DECK_NOTE_FIELD,
  ENLACE,
  SEGMENTO,
  SEGMENTOS,
  SEGMENTO_ACTIVO,
  SEGMENTO_INACTIVO,
  VACIO,
} from "@/lib/ui";
import { irArriba } from "@/lib/scroll";
import { cn } from "@/lib/utils";

interface BuilderViewProps {
  /** La primera pagina de la grilla sin filtros, prerenderizada en el HTML. */
  inicial: Card[];
  /** Cuantas cartas tiene el catalogo. */
  total: number;
  /** Las facetas del catalogo entero, calculadas en el build. */
  facets: Facets;
}

/** Una baraja vacia y fija: la que se resuelve mientras baja el catalogo. */
const SIN_CATALOGO = createDeck();

/**
 * Los rechazos del constructor ("ya lleva 3 copias") van como aviso `warning`.
 * Vive fuera del componente para ser estable: DeckParamLoader la tiene en las
 * dependencias de su efecto.
 */
const avisarError = (mensaje: string) => toast(mensaje, "warning");

function GuardarButton({
  guardado,
  onGuardar,
}: {
  guardado: boolean;
  onGuardar: () => void;
}) {
  return (
    <button type="button" onClick={onGuardar} className={BOTON_PRIMARIO}>
      {guardado ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Save size={14} aria-hidden="true" />
      )}
      {guardado ? "Guardado" : "Guardar baraja"}
    </button>
  );
}

/**
 * A donde van las cartas que se agregan: a la baraja o al side.
 *
 * El side deck es opcional y admite de 0 a SIDE_TOTAL cartas, pero no
 * es una baraja aparte: comparte el tope de copias y las Unicas con el principal.
 * Por eso esto elige un destino y no abre una vista distinta.
 */
function ZonaSwitch({
  zona,
  onZona,
  enPrincipal,
  enElSide,
}: {
  zona: DeckZone;
  onZona: (z: DeckZone) => void;
  enPrincipal: number;
  enElSide: number;
}) {
  const opciones: { z: DeckZone; texto: string; cuenta: string }[] = [
    { z: "principal", texto: "Baraja", cuenta: `${enPrincipal}/${DECK_TOTAL}` },
    { z: "side", texto: "Side deck", cuenta: `${enElSide}/${SIDE_TOTAL}` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-muted">Agregar a:</span>
      <div role="group" aria-label="Agregar a" className={SEGMENTOS}>
        {opciones.map(({ z, texto, cuenta }) => (
          <button
            key={z}
            type="button"
            onClick={() => onZona(z)}
            aria-pressed={zona === z}
            className={cn(SEGMENTO, zona === z ? SEGMENTO_ACTIVO : SEGMENTO_INACTIVO)}
          >
            {texto}{" "}
            <span
              className={cn(
                "text-[12px] tabular-nums",
                zona === z ? "text-white/90" : "text-muted",
              )}
            >
              {cuenta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuilderView({
  inicial,
  total,
  facets: facetsIniciales,
}: BuilderViewProps) {
  /*
   * El catalogo no viaja en el HTML: llega de `/data/cards.json`
   * (`useCatalogo`). Hasta entonces la grilla muestra `inicial` y la baraja
   * no se toca: sin el catalogo entero no se puede resolver ni validar, y un
   * borrador saldria con cartas de menos.
   */
  const catalogo = useCatalogo();
  const completo = catalogo.cards !== null;
  const cards = catalogo.cards ?? inicial;
  const [deck, setDeck] = useState<Deck>(() => createDeck());
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  /**
   * A que zona van las cartas que se agregan desde el catalogo.
   *
   * El side es una EXTENSION de la baraja, no una baraja aparte: comparte el tope de
   * copias, las Unicas y la afinidad de raza, de eso se encarga `canAdd`. Aqui
   * solo se elige el destino.
   */
  const [zona, setZona] = useState<DeckZone>("principal");
  /**
   * Los "+" pulsados antes de que llegue el catalogo: la primera pagina ya se
   * ve y se puede pulsar, pero sin el catalogo no se puede validar. Se aplican
   * en orden en cuanto llega, en vez de perder el clic.
   */
  const [pendientes, setPendientes] = useState<{ card: Card; zone: DeckZone }[]>([]);
  const router = useRouter();

  /*
   * El borrador (`deck-draft.ts`): la baraja en curso se guarda sola en el
   * navegador, para que refrescar o cambiar de vista no la pierda.
   *
   * `listo` espera a que DeckParamLoader decida que baraja mostrar: el primer
   * render trae una vacia, y escribirla pisaria el borrador antes de leerlo.
   * `cargada` es la baraja tal como llego; mientras haya un borrador de OTRA
   * en espera y no se toque la que llego, ese borrador no se pisa.
   */
  const [listo, setListo] = useState(false);
  const [borrador, setBorrador] = useState<DraftState | null>(null);
  const [cargada, setCargada] = useState<Deck | null>(null);

  const alCargar = useCallback((d: Deck, estado: DraftState | null) => {
    setDeck(d);
    setCargada(d);
    setBorrador(estado);
  }, []);
  const alEstarListo = useCallback(() => setListo(true), []);

  const esperando = borrador?.tipo === "en-espera" && deck === cargada;
  useEffect(() => {
    if (!listo || esperando) return;
    const guardada = readDeck(deck.id);
    if (hayCambios(deck, guardada)) writeDraft(deck, guardada ? deck.id : null);
    else clearDraft();
  }, [deck, listo, esperando]);

  // El aviso de un borrador en espera deja de tener sentido en cuanto se toca
  // la baraja que llego: el borrador ya se piso.
  const aviso = borrador?.tipo === "en-espera" && !esperando ? null : borrador;

  // En una recuperada la baraja ya esta en pantalla: Recuperar solo cierra.
  const recuperar = () => {
    if (borrador?.tipo === "en-espera") {
      setDeck(borrador.draft.deck);
      setCargada(borrador.draft.deck);
    }
    setBorrador(null);
    toast("Baraja sin guardar recuperada.", "success");
  };

  const descartar = () => {
    if (borrador?.tipo === "en-espera") {
      clearDraft();
      setBorrador(null);
      toast("Borrador descartado.", "delete");
      return;
    }
    // La recuperada vuelve a como estaba guardada, o a empezar de cero.
    const guardada = readDeck(deck.id);
    clearDraft();
    setDeck(guardada ?? createDeck());
    setBorrador(null);
    toast(
      guardada
        ? `Cambios sin guardar descartados: "${deckTitle(guardada)}" quedó como estaba guardada.`
        : "Borrador descartado.",
      "delete",
    );
  };

  const avisoBorrador = (className?: string) =>
    aviso && (
      <DraftNotice
        estado={aviso}
        nombre={deckTitle(deck)}
        onRecuperar={recuperar}
        onDescartar={descartar}
        className={className}
      />
    );

  // Caros de construir y el catalogo no cambia en runtime.
  const search = useMemo(() => buildSearchIndex(cards), [cards]);
  const index = useMemo(() => buildCardIndex(cards), [cards]);
  const impresiones = useMemo(() => agruparImpresiones(cards), [cards]);

  const vigente = completo ? deck : SIN_CATALOGO;
  const res = useMemo(() => resolveDeck(vigente, index), [vigente, index]);
  const stats = useMemo(() => deckStats(res), [res]);
  const issues = useMemo(() => validateDeck(vigente, index), [vigente, index]);

  // El nombre choca con otra baraja guardada: se avisa mientras se escribe, no
  // recien al pulsar Guardar.
  const guardadas = useDecks();
  const nombreRepetido = nombreOcupado(deck.nombre, guardadas, deck.id);

  /** Copias por impresion, para el numerito de cada carta de la grilla. */
  const copiasPorId = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of [...deck.principal, ...deck.side]) {
      m.set(e.id, (m.get(e.id) ?? 0) + e.n);
    }
    return m;
  }, [deck]);

  /**
   * Solo las cartas que pueden entrar en ESTE baraja.
   *
   * En cuanto la baraja tiene un Aliado su afinidad empieza a cerrarse: o sigue
   * mono-raza, o crece hacia su escuela, o se sostiene por el atributo.
   * Ofrecer cartas que el validador va a rechazar solo hace perder el tiempo.
   * La afinidad la llevan los Aliados y nadie mas, asi que Talismanes, Armas,
   * Totems y Oros entran en cualquier baraja y nunca se filtran.
   *
   * Vale para las dos zonas: el side entra a la baraja entre partidas, asi que no
   * puede traer un Aliado que la baraja no admite.
   */
  const acotado = !stats.afinidad.vacio && stats.afinidad.vias.length > 0;
  const disponibles = useMemo(
    () => (acotado ? cards.filter((c) => admite(stats.afinidad, c)) : cards),
    [cards, stats.afinidad, acotado],
  );

  // Las facetas salen de lo que de verdad se puede agregar: si el filtro de
  // raza ofreciera razas que la grilla ya escondio, no devolveria nada nunca.
  const facets = useMemo(
    () => (completo ? buildFacets(disponibles) : facetsIniciales),
    [completo, disponibles, facetsIniciales],
  );

  const results = useMemo(
    () => ordenarCartas(applyFilters(disponibles, filters, search), filters.orden),
    [disponibles, filters, search],
  );
  // Sin el catalogo, `results` sale de `inicial`: solo vale para la primera
  // pagina sin filtros. Lo demas espera con el esqueleto de la grilla.
  const cuantos = completo ? results.length : total;
  const totalPages = pageCount(cuantos, PAGE_SIZE_BUILDER);
  const currentPage = Math.min(page, totalPages);
  const visible =
    completo || (!hasActiveFilters(filters) && currentPage === 1)
      ? paginate(results, currentPage, PAGE_SIZE_BUILDER)
      : null;

  // Guardar termina el trabajo del constructor, asi que lleva a la ficha del
  // baraja: es donde se ve entero, se comparte y se borra. La baraja ya esta en
  // localStorage cuando navegamos, y /baraja lo lee de ahi por su id.
  const guardar = () => {
    if (!completo) return;
    if (deck.nombre.trim() === "") {
      avisarError("La baraja necesita un nombre para poder guardarse.");
      return;
    }
    // Crear no resuelve solo un choque de nombres: el nombre lo eligio quien
    // arma, asi que se le pide otro en vez de cambiarselo por detras.
    if (nombreOcupado(deck.nombre, readDecks(), deck.id)) {
      avisarError(
        `Ya existe una baraja llamada "${deckTitle(deck)}". Elige otro nombre.`,
      );
      return;
    }
    // Guardar una baraja incompleta o con una baneada se puede, pero se avisa;
    // y editar una ya guardada se confirma, porque pisa la version anterior.
    // Una baraja nueva y legal se guarda sin preguntar.
    const yaExistia = readDeck(deck.id) !== null;
    if (yaExistia || !isLegal(issues)) {
      setConfirmarGuardar(true);
      return;
    }
    escribir(false);
  };

  const escribir = (yaExistia: boolean) => {
    setConfirmarGuardar(false);
    const r = saveDeck(deck);
    if (r !== "ok") {
      avisarError(mensajeNoGuardada(r));
      return;
    }
    setGuardado(true);
    clearDraft();
    setBorrador(null);
    // El aviso se pide antes de navegar y se lee ya en la pagina de la baraja.
    toast(
      yaExistia
        ? `Cambios guardados correctamente en "${deckTitle(deck)}".`
        : `Baraja "${deckTitle(deck)}" creada correctamente.`,
      "success",
    );
    router.push(`/baraja/?m=${deck.id}`);
  };

  // Vaciar pide confirmar: rehacer una baraja de 50 cartas a mano es caro.
  const vaciar = () => {
    if (deck.principal.length === 0 && deck.side.length === 0) return;
    setConfirmarVaciar(true);
  };
  const vaciarYa = () => {
    setConfirmarVaciar(false);
    setDeck((d) => clearDeck(d));
    toast("Baraja vaciada: se quitaron todas sus cartas.", "delete");
  };

  const agregar = (card: Card, zone: DeckZone = zona) => {
    if (!completo) {
      setPendientes((p) => [...p, { card, zone }]);
      return;
    }
    const rc = index.porId.get(card.id);
    if (!rc) return;
    const check = canAdd(deck, rc, zone, index);
    if (!check.ok) {
      avisarError(check.mensaje);
      return;
    }
    // addCard cuenta las copias de ESA zona; copiasPorId suma las dos y aqui
    // daria la cuenta equivocada si la carta ya estuviera en el side.
    setDeck((d) => addCard(d, card.id, zone));
    // Una baneada entra igual, pero avisando que la baraja sale del formato.
    if (check.aviso) toast(check.aviso, "warning");
  };

  /**
   * Quita una copia desde el modal. Sale de la zona elegida en "Agregar a" si
   * la carta esta ahi, y si no de la otra: el modal cuenta las dos juntas, asi
   * que tiene que poder quitar de las dos.
   */
  const quitar = (card: Card) => {
    if (!completo) return;
    const otra: DeckZone = zona === "principal" ? "side" : "principal";
    const desde = copiesOf(deck, card.id, zona) > 0 ? zona : otra;
    setDeck((d) => removeCard(d, card.id, desde));
  };

  /**
   * Las copias que la baraja lleva de OTRAS impresiones de la carta del modal:
   * el modal ofrece pasarlas todas al arte que se esta viendo.
   */
  const otrasImpresiones = (card: Card) => {
    const ids = (impresiones.get(card.identidad) ?? [])
      .map((c) => c.id)
      .filter((id) => id !== card.id);
    return { ids, copias: ids.reduce((s, id) => s + (copiasPorId.get(id) ?? 0), 0) };
  };

  const cambiarArte = (card: Card) => {
    const { ids, copias } = otrasImpresiones(card);
    setDeck((d) => swapPrinting(d, ids, card.id));
    toast(
      `${copias} ${copias === 1 ? "copia" : "copias"} de ${card.nombre} con el arte nuevo.`,
      "success",
    );
  };

  // Llego el catalogo: los "+" que esperaban se aplican en orden, con las
  // mismas reglas que un clic normal.
  useEffect(() => {
    if (!completo || pendientes.length === 0) return;
    let d = deck;
    for (const { card, zone } of pendientes) {
      const rc = index.porId.get(card.id);
      if (!rc) continue;
      const check = canAdd(d, rc, zone, index);
      if (!check.ok) {
        avisarError(check.mensaje);
        continue;
      }
      d = addCard(d, card.id, zone);
      if (check.aviso) toast(check.aviso, "warning");
    }
    // Aplica lo que el usuario pidio mientras faltaba un sistema externo (el
    // catalogo, que llega por red), una sola vez.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendientes([]);
    setDeck(d);
  }, [completo, pendientes, deck, index]);

  const bloqueoDe = (card: Card): string | undefined => {
    if (!completo) return undefined;
    const rc = index.porId.get(card.id);
    if (!rc) return undefined;
    const check = canAdd(deck, rc, zona, index);
    return check.ok ? undefined : check.mensaje;
  };

  // Sin el catalogo, la silueta del panel: resolverla con cartas de menos
  // mostraria una baraja que no es.
  const panel = !completo ? (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ) : (
    <DeckPanel
      deck={deck}
      res={res}
      stats={stats}
      issues={issues}
      index={index}
      onSetQuantity={(id, zone, n) => setDeck((d) => setQuantity(d, id, zone, n))}
      onSetStartingGold={(id) => setDeck((d) => setStartingGold(d, id))}
      onVer={(id) => setSelected(cards.find((c) => c.id === id) ?? null)}
      onBlocked={avisarError}
    />
  );

  return (
    <>
      {/* Aislar useSearchParams aqui deja prerenderizar todo lo de arriba. */}
      <Suspense fallback={null}>
        <DeckParamLoader onLoad={alCargar} onError={avisarError} onReady={alEstarListo} />
      </Suspense>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col gap-5">
          {/* En el telefono el panel va en una hoja cerrada: el aviso sube aqui. */}
          {avisoBorrador("lg:hidden")}
          <Filters
            filters={filters}
            facets={facets}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          />

          <ZonaSwitch
            zona={zona}
            onZona={setZona}
            enElSide={stats.totalSide}
            enPrincipal={stats.totalPrincipal}
          />

          {/* Que el catalogo este acotado tiene que verse, o parece que faltan
              cartas. */}
          {acotado && (
            <p className="aparece text-muted -mt-2 text-[13px]">
              Mostrando solo cartas que caben en esta baraja: Aliados{" "}
              <span className="text-ink">{affinityAdmits(stats.afinidad)}</span>, más
              Talismanes, Armas, Tótems y Oros. Para cambiar de afinidad, quita los
              Aliados de la baraja.
            </p>
          )}

          {!visible ? (
            <CardGridSkeleton variante="constructor" cuantas={12} />
          ) : cuantos === 0 ? (
            <div className={VACIO}>
              <p className="text-ink">Ninguna carta coincide con esa búsqueda.</p>
              {hasActiveFilters(filters) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                  }}
                  className={cn(ENLACE, "mt-3 text-[15px]")}
                >
                  Limpiar los filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <CardGrid
                cards={visible}
                onSelect={setSelected}
                copies={copiasPorId}
                onAdd={(c) => agregar(c)}
                onRemove={quitar}
                addBlocked={bloqueoDe}
                onBlocked={avisarError}
                variante="constructor"
              />
              <Pagination
                page={currentPage}
                total={totalPages}
                range={pageRange(currentPage, cuantos, PAGE_SIZE_BUILDER)}
                results={cuantos}
                onChange={(n) => {
                  setPage(n);
                  irArriba();
                }}
              />
            </>
          )}
        </div>

        {/* En escritorio el panel acompana al catalogo; bajo lg pasa a hoja.
            Quien scrollea es el div de dentro, no el <aside>: asi la barra
            —y las flechas que dibujan Windows y macOS en sus extremos— cae
            dentro del panel y no montada sobre su esquina redondeada. */}
        <aside className="border-line bg-panel rounded-panel sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col overflow-hidden border p-2 lg:flex">
          {/* El titulo va FUERA del div que scrollea, para que no se vaya al
              recorrer el panel: es el mismo papel que cumple la cabecera
              pegajosa de la hoja bajo lg, y dice lo mismo. */}
          <h2 className="text-ink border-line mx-2 mt-1 mb-1 border-b pb-3 text-xl font-semibold tracking-[-0.01em]">
            La baraja
          </h2>
          <div className="scrollbar-slim min-h-0 overflow-y-auto p-2">
            {/* El panel crece y se encoge con transicion al agregar o quitar
                cartas, en vez de saltar (AutoHeight). */}
            <AutoHeight className="flex flex-col gap-4">
              {avisoBorrador()}
              <input
                value={deck.nombre}
                onChange={(e) => setDeck((d) => renameDeck(d, e.target.value))}
                placeholder="Nombre de la baraja"
                maxLength={MAX_NOMBRE_BARAJA}
                aria-label="Nombre de la baraja"
                aria-invalid={nombreRepetido || undefined}
                aria-describedby={nombreRepetido ? "nombre-repetido" : undefined}
                className={cn(DECK_NAME_FIELD, "bg-surface")}
              />
              {nombreRepetido && (
                <p
                  id="nombre-repetido"
                  className="aparece text-warning -mt-2 text-[12px]"
                >
                  Ya existe una baraja con este nombre.
                </p>
              )}
              <textarea
                value={deck.descripcion}
                onChange={(e) => setDeck((d) => describeDeck(d, e.target.value))}
                placeholder="Descripción (opcional)"
                aria-label="Descripción de la baraja"
                maxLength={MAX_DESCRIPCION_BARAJA}
                rows={2}
                className={cn(DECK_NOTE_FIELD, "bg-surface")}
              />
              {panel}
              <div className="border-line flex flex-wrap gap-2 border-t pt-4">
                <GuardarButton guardado={guardado} onGuardar={guardar} />
                <DeckClearButton onClear={vaciar} />
              </div>
            </AutoHeight>
          </div>
        </aside>
      </div>

      <DeckSheet
        total={stats.totalPrincipal}
        estado={estadoDeBaraja(issues)}
        afinidad={affinityLabel(stats.afinidad)}
        open={sheetOpen}
        onOpenChange={setSheetOpen}

        acciones={
          <>
            <GuardarButton guardado={guardado} onGuardar={guardar} />
            <DeckClearButton onClear={vaciar} />
          </>
        }
      >
        <input
          value={deck.nombre}
          onChange={(e) => setDeck((d) => renameDeck(d, e.target.value))}
          placeholder="Nombre de la baraja"
          maxLength={MAX_NOMBRE_BARAJA}
          aria-label="Nombre de la baraja"
          aria-invalid={nombreRepetido || undefined}
          aria-describedby={nombreRepetido ? "nombre-repetido-hoja" : undefined}
          className={DECK_NAME_FIELD}
        />
        {nombreRepetido && (
          <p id="nombre-repetido-hoja" className="aparece text-warning mt-1 text-[12px]">
            Ya existe una baraja con este nombre.
          </p>
        )}
        <textarea
          value={deck.descripcion}
          onChange={(e) => setDeck((d) => describeDeck(d, e.target.value))}
          placeholder="Descripción (opcional)"
          aria-label="Descripción de la baraja"
          maxLength={MAX_DESCRIPCION_BARAJA}
          rows={2}
          className={cn(DECK_NOTE_FIELD, "mt-2 mb-4")}
        />
        {panel}
      </DeckSheet>

      <CardModal
        card={selected}
        onClose={() => setSelected(null)}
        copies={selected ? (copiasPorId.get(selected.id) ?? 0) : 0}
        onAdd={selected ? () => agregar(selected) : undefined}
        onRemove={selected ? () => quitar(selected) : undefined}
        addBlocked={selected ? bloqueoDe(selected) : undefined}
        onBlocked={avisarError}
        // Elegir otra impresion cambia la carta del modal: agregar y quitar
        // actuan sobre la elegida.
        impresiones={selected ? impresiones.get(selected.identidad) : undefined}
        onChangeCard={setSelected}
        copiasDe={(id) => copiasPorId.get(id) ?? 0}
        cambiarArte={
          selected
            ? {
                copias: otrasImpresiones(selected).copias,
                onCambiar: () => cambiarArte(selected),
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmarVaciar}
        titulo="¿Vaciar la baraja?"
        mensaje="Se quitan todas las cartas de la baraja y del side deck. El nombre y la descripción se conservan."
        confirmar="Vaciar la baraja"
        onConfirm={vaciarYa}
        onCancel={() => setConfirmarVaciar(false)}
      />

      <ConfirmGuardar
        open={confirmarGuardar}
        nombre={deckTitle(deck)}
        editando={confirmarGuardar && readDeck(deck.id) !== null}
        issues={issues}
        total={stats.totalPrincipal}
        vacia={res.principal.length === 0 && res.side.length === 0}
        onConfirm={() => escribir(readDeck(deck.id) !== null)}
        onCancel={() => setConfirmarGuardar(false)}
      />
    </>
  );
}

/**
 * Confirma un guardado que merece una pausa: editar una baraja ya guardada
 * (pisa la version anterior) o guardar una que no cumple. Cuando no cumple,
 * muestra la misma caja de estado del panel, en ambar si le falta algo y en
 * rojo si lleva una baneada.
 */
function ConfirmGuardar({
  open,
  nombre,
  editando,
  issues,
  total,
  vacia,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  nombre: string;
  editando: boolean;
  issues: DeckIssue[];
  total: number;
  vacia: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const legal = isLegal(issues);
  const fuera = estadoDeBaraja(issues) === "baneada";
  const titulo = legal
    ? "¿Guardar los cambios?"
    : fuera
      ? "La baraja está fuera del formato"
      : "La baraja está incompleta";
  const mensaje = legal
    ? `Se guardan los cambios en "${nombre}" y reemplazan la versión anterior.`
    : `${editando ? `Se guardan los cambios en "${nombre}". ` : ""}Se puede guardar así y terminar después, pero mientras no se corrija no cumple las reglas del formato.`;
  return (
    <ConfirmDialog
      open={open}
      titulo={titulo}
      mensaje={mensaje}
      confirmar={legal ? "Guardar cambios" : "Guardar igual"}
      cancelar="Seguir editando"
      tono={fuera ? "peligro" : "aviso"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {!legal && <DeckIssues issues={issues} total={total} vacia={vacia} />}
    </ConfirmDialog>
  );
}
