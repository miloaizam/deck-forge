"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Copy,
  Download,
  Hammer,
  ImageDown,
  Layers,
  Link2,
  Save,
  Trash2,
} from "lucide-react";

import { DeckSections } from "./DeckSections";
import { CardModal } from "../CardModal";
import { ConfirmDialog } from "../ConfirmDialog";
import { CostCurve } from "../CostCurve";
import { HandTester } from "./HandTester";
import { downloadDeckImage } from "./deck-image";
import { DeckDetailSkeleton } from "../Skeleton";
import { toast } from "../toast";
import { copyDeckList, copyShareLink, downloadDeck } from "./actions";
import { DeckIssues } from "./DeckIssues";
import { useDecks, useHydrated } from "./use-decks";
import { useSharedCode } from "./use-shared-code";
import { agruparImpresiones } from "@/lib/card-order";
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

interface DeckDetailViewProps {
  cards: Card[];
}

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";
/** Las dos tarjetas de analisis del final: mano de prueba y curva. */
const PANEL_ANALISIS =
  "border-line bg-panel rounded-panel flex flex-col border p-5 sm:p-6";
const ICONO =
  "inline-flex size-11 items-center justify-center rounded-chip border border-line text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/**
 * Muestra una baraja, sea tuya (`?m=`) o de un enlace compartido (`#d=`, o
 * `?d=` en los enlaces de antes).
 *
 * Es la unica forma de tener un detalle por baraja con `output: "export"`: una
 * ruta dinamica `/barajas/[id]` no puede existir, porque generateStaticParams no
 * conoce ids que se inventan en el navegador.
 */
export function DeckDetailView({ cards }: DeckDetailViewProps) {
  const params = useSearchParams();
  const m = params.get("m");
  const d = useSharedCode();

  /** Que carta se esta mirando en el modal. */
  const [vista, setVista] = useState<Card | null>(null);
  /** Borrar no tiene vuelta: se confirma en un modal aparte. */
  const [porBorrar, setPorBorrar] = useState(false);

  const router = useRouter();
  const decks = useDecks();
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
  }, [m, compartida, decks]);

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

  const guardar = () => {
    if (!deck || !d) return;
    // Ya guardada desde aqui y todavia en la lista: no se vuelve a escribir.
    // Ni una copia nueva ni encima de la guardada, que pudo editarse despues
    // en otra pestana.
    const previa =
      guardadaComo.current?.codigo === d
        ? decks.find((x) => x.id === guardadaComo.current?.id)
        : undefined;
    if (previa) {
      toast(`Esta baraja ya está en Mis barajas como "${deckTitle(previa)}".`, "info");
      return;
    }
    // Una compartida puede llamarse como una tuya: entra como "X (copia)".
    const aGuardar = {
      ...deck,
      id: newDeckId(),
      nombre: nombreLibre(deck.nombre, decks),
    };
    const r = saveDeck(aGuardar);
    if (r === "ok") {
      guardadaComo.current = { codigo: d, id: aGuardar.id };
      toast(`Baraja "${deckTitle(aGuardar)}" guardada en Mis barajas.`, "success");
    } else toast(mensajeNoGuardada(r), "warning");
  };

  if (!cargado) {
    // Esqueleto, no spinner: la baraja sale de la URL o de localStorage al montar.
    return <DeckDetailSkeleton />;
  }

  if (error || !deck) {
    return (
      <div className="border-line rounded-panel border border-dashed px-6 py-20 text-center">
        <Layers
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">{error || "No hay ninguna baraja aquí."}</p>
        <Link
          href="/barajas"
          className="text-accent focus-visible:outline-brand-500 mt-4 inline-block rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
        >
          Ver mis barajas
        </Link>
      </div>
    );
  }

  const res = resolveDeck(deck, index);
  const stats = deckStats(res);
  const issues = validateDeck(deck, index);
  const legal = isLegal(issues);
  const compartido = Boolean(d);
  const verCarta = (cardId: string) =>
    setVista(cards.find((c) => c.id === cardId) ?? null);

  return (
    <div className="flex flex-col gap-5">
      {/* El nombre de la baraja ES el titulo de la pagina; a su lado, el conteo y
          las mismas acciones que trae su tarjeta en /barajas. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Baraja</p>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">{deckTitle(deck)}</h1>
          {/* La descripcion es opcional: si esta vacia no deja hueco. */}
          {deck.descripcion.trim() !== "" && (
            <p className="text-muted mt-2 max-w-[60ch] text-[13px] leading-relaxed">
              {deck.descripcion}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-muted text-[13px] tabular-nums">
            {stats.totalPrincipal}/{DECK_TOTAL} cartas
            {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
          </p>

          <div className="flex flex-wrap gap-2">
            {compartido ? (
              <button type="button" onClick={guardar} className={BOTON}>
                <Save size={14} aria-hidden="true" />
                Guardar en mis barajas
              </button>
            ) : (
              <Link href={`/constructor/?m=${deck.id}`} className={BOTON}>
                <Hammer size={14} aria-hidden="true" />
                Editar
              </Link>
            )}
            <button
              type="button"
              onClick={() => void copyShareLink(deck)}
              className={BOTON}
            >
              <Link2 size={14} aria-hidden="true" />
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={() => void copyDeckList(deck, res)}
              className={BOTON}
            >
              <ClipboardList size={14} aria-hidden="true" />
              Copiar lista
            </button>
            <button
              type="button"
              onClick={() => downloadDeck(deck)}
              title="Exportar a un archivo de respaldo"
              className={BOTON}
            >
              <Download size={14} aria-hidden="true" />
              Exportar
            </button>
            <button
              type="button"
              onClick={() =>
                void downloadDeckImage(deck, res)
                  .then(() => toast(`Imagen de "${deckTitle(deck)}" descargada.`, "info"))
                  .catch(() =>
                    toast("No se pudo generar la imagen de la baraja.", "warning"),
                  )
              }
              title="Descargar como imagen PNG"
              className={BOTON}
            >
              <ImageDown size={14} aria-hidden="true" />
              Imagen
            </button>

            {/* Duplicar y borrar solo tienen sentido sobre una baraja tuya. */}
            {!compartido && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const copia = duplicateDeck(deck, nombreLibre(deck.nombre, decks));
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
                  className={ICONO}
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPorBorrar(true)}
                  aria-label="Borrar la baraja"
                  title="Borrar"
                  className={ICONO}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
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
        mensaje={`"${deckTitle(deck)}" se borra de este navegador y no hay de dónde recuperarla.`}
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
