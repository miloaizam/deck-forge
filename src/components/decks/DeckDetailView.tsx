"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Copy, Hammer, ImageDown, Layers, Link2, Save, Trash2 } from "lucide-react";

import { DeckSections } from "./DeckSections";
import { CardModal } from "../CardModal";
import { ConfirmDialog } from "../ConfirmDialog";
import { CostCurve } from "../CostCurve";
import { HandTester } from "./HandTester";
import { descargarImagenDeBaraja } from "./deck-image";
import { ConCatalogo } from "../ConCatalogo";
import { DeckDetailSkeleton } from "../Skeleton";
import { toast } from "../toast";
import { copyPublicLink, copyShareLink } from "./actions";
import { DeckIssues } from "./DeckIssues";
import { registrarCopia } from "../nube/comunidad-api";
import { PublicaAcciones, usePublica } from "../nube/PublicaAcciones";
import { PublicarControl } from "../nube/PublicarControl";
import { useNube } from "../nube/nube";
import { RequiereCuenta } from "../nube/RequiereCuenta";
import { useDecks, useHydrated } from "./use-decks";
import { useSharedCode } from "./use-shared-code";
import { agruparImpresiones } from "@/lib/card-order";
import { claveAfinidad, etiquetaAfinidad } from "@/lib/comunidad";
import { deckTitle, duplicateDeck, newDeckId, setCover } from "@/lib/deck";
import { decodeDeck } from "@/lib/deck-code";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { deleteDeck, mensajeNoGuardada, nombreLibre, saveDeck } from "@/lib/deck-storage";
import type { Card, Deck } from "@/lib/types";
import { BOTON_ICONO, BOTON_SECUNDARIO, ENLACE, HOVER_PELIGRO, VACIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface DeckDetailViewProps {
  cards: Card[];
}

/** Las dos tarjetas de analisis del final: mano de prueba y curva. */
const PANEL_ANALISIS =
  "border-line bg-panel rounded-panel flex flex-col border p-5 sm:p-6";

/**
 * Muestra una baraja, sea tuya (`?m=`), de un enlace compartido (`#d=`, o
 * `?d=` en los enlaces de antes) o publicada en la Comunidad (`?p=`, su
 * `public_id`).
 *
 * Es la unica forma de tener un detalle por baraja con `output: "export"`: una
 * ruta dinamica `/barajas/[id]` no puede existir, porque generateStaticParams no
 * conoce ids que se inventan en el navegador.
 */
export function DeckDetailView() {
  const params = useSearchParams();
  const compartida = useSharedCode();
  // Una baraja propia (`?m=`) pide cuenta; una compartida o publica, no.
  const ajena = compartida !== null || params.get("p") !== null;
  return (
    <RequiereCuenta
      para="ver tus barajas"
      esqueleto={<DeckDetailSkeleton />}
      libre={ajena}
    >
      <ConCatalogo esqueleto={<DeckDetailSkeleton />}>
        {(cards) => <DeckDetail cards={cards} />}
      </ConCatalogo>
    </RequiereCuenta>
  );
}

function DeckDetail({ cards }: DeckDetailViewProps) {
  const params = useSearchParams();
  const m = params.get("m");
  const p = params.get("p");
  const d = useSharedCode();
  const publica = usePublica(d ? null : p);

  /** Que carta se esta mirando en el modal. */
  const [vista, setVista] = useState<Card | null>(null);
  /** Borrar no tiene vuelta: se confirma en un modal aparte. */
  const [porBorrar, setPorBorrar] = useState(false);

  const router = useRouter();
  const decks = useDecks();
  const nube = useNube();
  const cargado = useHydrated();
  const index = useMemo(() => buildCardIndex(cards), [cards]);
  const impresiones = useMemo(() => agruparImpresiones(cards), [cards]);

  // Aparte y solo con `d`, para no volver a decodificar cada vez que cambia
  // el store (guardar la compartida lo cambia).
  const compartida = useMemo(() => (d ? decodeDeck(d) : null), [d]);

  /**
   * Con que id se guardo ya ESTE enlace desde esta pagina. `decodeDeck` inventa
   * un id en cada llamada, asi que no sirve para saber si ya se guardo: antes,
   * pulsar "Guardar" tres veces dejaba tres barajas iguales.
   */
  const guardadaComo = useRef<{ codigo: string; id: string } | null>(null);

  // La baraja se DERIVA de la URL y del store, sin estado propio ni efectos: asi
  // cambiar de ?m=a a ?m=b no deja pegado el anterior y no hay renders en
  // cascada. El codigo compartido manda si vienen los dos parametros.
  const { deck, error } = useMemo((): { deck: Deck | null; error: string } => {
    if (publica?.fase === "ok") return { deck: publica.baraja.datos, error: "" };
    if (publica?.fase === "error") return { deck: null, error: publica.mensaje };
    if (compartida) {
      return compartida.ok
        ? { deck: compartida.deck, error: "" }
        : { deck: null, error: compartida.mensaje };
    }
    if (m) {
      const guardado = decks.find((x) => x.id === m);
      return guardado
        ? { deck: guardado, error: "" }
        : { deck: null, error: "No se encontró esa baraja en este navegador." };
    }
    return { deck: null, error: "Este enlace no contiene ninguna baraja." };
  }, [m, compartida, decks, publica]);

  /**
   * La portada se guarda al vuelo: la baraja sale del store, asi que escribirlo
   * basta para que la lista y esta vista se enteren. En una baraja compartida no
   * se ofrece —no hay nada guardado que actualizar—, y de eso se encarga el
   * `onPortada` que se le pasa (o no) a DeckSections.
   */
  const elegirPortada = (cardId: string | null) => {
    if (!deck) return;
    const r = saveDeck(setCover(deck, cardId));
    if (r !== "ok") toast(mensajeNoGuardada(r), "warning");
  };

  /** Lo que identifica a la baraja ajena que se mira: su enlace o su id publico. */
  const codigo = d ?? (publica?.fase === "ok" ? publica.baraja.public_id : null);

  const guardar = () => {
    if (!deck || !codigo) return;
    // Ya guardada desde aqui y todavia en la lista: no se vuelve a escribir.
    // Ni una copia nueva ni encima de la guardada, que pudo editarse despues
    // en otra pestana.
    const previa =
      guardadaComo.current?.codigo === codigo
        ? decks.find((x) => x.id === guardadaComo.current?.id)
        : undefined;
    if (previa) {
      toast(`Esta baraja ya está en Mis barajas como "${deckTitle(previa)}".`, "info");
      return;
    }
    // Una compartida puede llamarse como una tuya: entra como "X (copia)".
    const ahora = Date.now();
    const aGuardar = {
      ...deck,
      id: newDeckId(),
      nombre: nombreLibre(deck.nombre, decks),
      creado: ahora,
      actualizado: ahora,
    };
    const r = saveDeck(aGuardar);
    if (r === "ok") {
      guardadaComo.current = { codigo, id: aGuardar.id };
      toast(`Baraja "${deckTitle(aGuardar)}" guardada en Mis barajas.`, "success");
      // De la Comunidad: cuenta como copiada (una vez por persona con sesion).
      if (!d) void registrarCopia(codigo).catch(() => undefined);
    } else toast(mensajeNoGuardada(r), "warning");
  };

  if (!cargado || publica?.fase === "cargando") {
    // Esqueleto, no spinner: la baraja sale de la URL o de localStorage al montar.
    return <DeckDetailSkeleton />;
  }

  if (error || !deck) {
    return (
      <div className={VACIO}>
        <Layers
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">{error || "No hay ninguna baraja aquí."}</p>
        <Link href="/barajas" className={cn(ENLACE, "mt-4 inline-block text-[15px]")}>
          Ver mis barajas
        </Link>
      </div>
    );
  }

  const res = resolveDeck(deck, index);
  const stats = deckStats(res);
  const issues = validateDeck(deck, index);
  const legal = isLegal(issues);
  const compartido = Boolean(d) || publica !== null;
  const deLaComunidad = publica?.fase === "ok" ? publica.baraja : null;
  const verCarta = (cardId: string) =>
    setVista(cards.find((c) => c.id === cardId) ?? null);

  return (
    <div className="flex flex-col gap-5">
      {/* El nombre de la baraja ES el titulo de la pagina; a su lado, el conteo y
          las mismas acciones que trae su tarjeta en /barajas. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow mb-3">
            {deLaComunidad ? (
              <Link href="/comunidad" className="hover:text-ink">
                Comunidad
              </Link>
            ) : (
              "Baraja"
            )}
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">{deckTitle(deck)}</h1>
          {deLaComunidad && (
            <p className="mt-1.5 text-[14px]">
              por <span className="text-accent font-medium">{deLaComunidad.alias}</span>
              <span className="text-muted">
                {" · "}
                {etiquetaAfinidad(claveAfinidad(stats.afinidad))}
              </span>
            </p>
          )}
          {/* El conteo va bajo el titulo, que es lo que describe; arriba a la
              derecha flotaba lejos de el, sobre los botones. */}
          <p className="text-muted mt-1.5 text-[14px] tabular-nums">
            {stats.totalPrincipal}/{DECK_TOTAL} cartas
            {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
          </p>
          {/* La descripcion es opcional: si esta vacia no deja hueco. */}
          {deck.descripcion.trim() !== "" && (
            <p className="text-muted mt-2 max-w-[60ch] text-[13px] leading-relaxed">
              {deck.descripcion}
            </p>
          )}
        </div>

        <PublicarControl
          deck={deck}
          legal={legal}
          afinidad={claveAfinidad(stats.afinidad)}
          activo={!compartido}
        >
          {({ control, detalle }) => (
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {compartido ? (
                  <button type="button" onClick={guardar} className={BOTON_SECUNDARIO}>
                    <Save size={14} aria-hidden="true" />
                    Guardar en mis barajas
                  </button>
                ) : (
                  <Link href={`/constructor/?m=${deck.id}`} className={BOTON_SECUNDARIO}>
                    <Hammer size={14} aria-hidden="true" />
                    Editar
                  </Link>
                )}
                {/* Las acciones sobre la baraja van en iconos, con su nombre
                    en el title y en aria-label; al final, Privada / Publica. */}
                <button
                  type="button"
                  onClick={() => descargarImagenDeBaraja(deck, res)}
                  aria-label="Descargar como imagen"
                  title="Descargar como imagen"
                  className={BOTON_ICONO}
                >
                  <ImageDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void (deLaComunidad
                      ? copyPublicLink(deck, deLaComunidad.public_id)
                      : copyShareLink(deck))
                  }
                  aria-label="Copiar enlace"
                  title="Copiar enlace"
                  className={BOTON_ICONO}
                >
                  <Link2 size={16} aria-hidden="true" />
                </button>

                {/* Duplicar y borrar solo tienen sentido sobre una baraja tuya. */}
                {!compartido && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const copia = duplicateDeck(
                          deck,
                          nombreLibre(deck.nombre, decks),
                        );
                        const r = saveDeck(copia);
                        if (r === "ok") {
                          toast(
                            `Baraja duplicada como "${deckTitle(copia)}". La copia está en Mis barajas.`,
                            "success",
                          );
                        } else toast(mensajeNoGuardada(r, "duplicar"), "warning");
                      }}
                      aria-label="Duplicar la baraja"
                      title="Duplicar"
                      className={BOTON_ICONO}
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPorBorrar(true)}
                      aria-label="Borrar la baraja"
                      title="Borrar"
                      className={cn(BOTON_ICONO, HOVER_PELIGRO)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </>
                )}
                {control}
              </div>
              {deLaComunidad && <PublicaAcciones baraja={deLaComunidad} />}
              {detalle}
            </div>
          )}
        </PublicarControl>
      </header>

      {/* El estado solo aparece cuando hay algo que corregir: decirle "todo
          bien" a quien ya ve la baraja completa es ruido. Es el mismo
          componente del constructor, para que los dos digan lo mismo. */}
      {!legal && (
        <DeckIssues
          issues={issues}
          total={stats.totalPrincipal}
          vacia={res.principal.length === 0 && res.side.length === 0}
        />
      )}

      <DeckSections
        res={res}
        oroInicial={deck.oroInicial}
        portada={deck.portada}
        onPortada={compartido ? undefined : elegirPortada}
        onVer={verCarta}
      />

      {/* Al final, la vista partida en dos: probar una mano y la curva. Van
          aqui y no arriba porque son analisis de la baraja, no la baraja; y en
          dos tarjetas iguales, que la curva sola en una tarjeta angosta
          quedaba descolgada de todo lo demas. */}
      {res.principal.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <HandTester
            res={res}
            oroInicial={deck.oroInicial}
            onVer={verCarta}
            className={PANEL_ANALISIS}
          />
          <CostCurve
            curva={stats.curva}
            oros={stats.porTipo.Oro}
            variante="tarjeta"
            barras="min-h-44 flex-1"
            className={PANEL_ANALISIS}
          />
        </div>
      )}

      {/* El mismo modal del catalogo, sin el boton de agregar: aqui la baraja ya
          esta armado y se viene a mirar la carta, no a cambiarla. */}
      <CardModal
        card={vista}
        onClose={() => setVista(null)}
        impresiones={vista ? impresiones.get(vista.identidad) : undefined}
        onChangeCard={setVista}
      />

      <ConfirmDialog
        open={porBorrar}
        titulo="¿Borrar la baraja?"
        mensaje={
          nube.fase === "con-sesion"
            ? `"${deckTitle(deck)}" se borra de este navegador y de tu cuenta${nube.publicas[deck.id]?.publica ? ", y sale de la Comunidad" : ""}. No hay de dónde recuperarla.`
            : `"${deckTitle(deck)}" se borra de este navegador y no hay de dónde recuperarla.`
        }
        confirmar="Borrar la baraja"
        onConfirm={() => {
          deleteDeck(deck.id);
          // El aviso vive en el layout y sobrevive al cambio de pagina: se lee
          // al llegar a Mis barajas.
          toast(`Baraja "${deckTitle(deck)}" eliminada.`, "delete");
          router.push("/barajas");
        }}
        onCancel={() => setPorBorrar(false)}
      />
    </div>
  );
}
