"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Hammer,
  ImageDown,
  Layers,
  Link2,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { DeckSections } from "./DeckSections";
import { CardModal } from "../CardModal";
import { ConfirmDialog } from "../ConfirmDialog";
import { CostCurve } from "../CostCurve";
import { HandTester } from "./HandTester";
import { downloadDeckImage } from "./deck-image";
import { DeckDetailSkeleton } from "../Skeleton";
import { toast } from "../toast";
import { copyShareLink, downloadDeck } from "./actions";
import { useDecks, useHydrated } from "./use-decks";
import { useSharedCode } from "./use-shared-code";
import { deckTitle, duplicateDeck, setCover } from "@/lib/deck";
import { decodeDeck } from "@/lib/deck-code";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { deleteDeck, nombreLibre, saveDeck } from "@/lib/deck-storage";
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

  // La baraja se DERIVA de la URL y del store, sin estado propio ni efectos: asi
  // cambiar de ?m=a a ?m=b no deja pegado el anterior y no hay renders en
  // cascada. El codigo compartido manda si vienen los dos parametros.
  const { deck, error } = useMemo((): { deck: Deck | null; error: string } => {
    if (d) {
      const r = decodeDeck(d);
      return r.ok ? { deck: r.deck, error: "" } : { deck: null, error: r.mensaje };
    }
    if (m) {
      const guardado = decks.find((x) => x.id === m);
      return guardado
        ? { deck: guardado, error: "" }
        : { deck: null, error: "No se encontró esa baraja en este navegador." };
    }
    return { deck: null, error: "Este enlace no contiene ninguna baraja." };
  }, [m, d, decks]);

  /**
   * La portada se guarda al vuelo: la baraja sale del store, asi que escribirlo
   * basta para que la lista y esta vista se enteren. En una baraja compartida no
   * se ofrece —no hay nada guardado que actualizar—, y de eso se encarga el
   * `onPortada` que se le pasa (o no) a DeckSections.
   */
  const elegirPortada = (cardId: string | null) => {
    if (!deck) return;
    if (!saveDeck(setCover(deck, cardId))) {
      toast("No se pudo guardar: el almacenamiento del navegador está lleno.", "warning");
    }
  };

  const guardar = () => {
    if (!deck) return;
    // Una compartida puede llamarse como una tuya: entra como "X (copia)". Se
    // excluye la propia, por si ya se habia guardado desde esta misma pagina.
    const nombre = nombreLibre(
      deck.nombre,
      decks.filter((x) => x.id !== deck.id),
    );
    const aGuardar = nombre === deck.nombre ? deck : { ...deck, nombre };
    if (saveDeck(aGuardar)) {
      toast(`Baraja "${deckTitle(aGuardar)}" guardada en Mis barajas.`, "success");
    } else
      toast("No se pudo guardar: el almacenamiento del navegador está lleno.", "warning");
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
              aria-label="Compartir la baraja"
              title="Copiar enlace"
              className={ICONO}
            >
              <Link2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => downloadDeck(deck)}
              aria-label="Exportar la baraja"
              title="Exportar a un archivo"
              className={ICONO}
            >
              <Download size={14} aria-hidden="true" />
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
              aria-label="Descargar la baraja como imagen"
              title="Descargar como imagen"
              className={ICONO}
            >
              <ImageDown size={14} aria-hidden="true" />
            </button>

            {/* Duplicar y borrar solo tienen sentido sobre una baraja tuya. */}
            {!compartido && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const copia = duplicateDeck(deck, nombreLibre(deck.nombre, decks));
                    if (saveDeck(copia)) {
                      toast(
                        `Baraja duplicada como "${deckTitle(copia)}". La copia está en Mis barajas.`,
                        "success",
                      );
                    } else {
                      toast(
                        "No se pudo duplicar: el almacenamiento del navegador está lleno.",
                        "warning",
                      );
                    }
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

      {/* El panel de estado solo aparece cuando hay algo que corregir: decirle
          "todo bien" a quien ya ve la baraja completa es ruido. */}
      {!legal && (
        <div className="border-line bg-panel rounded-panel flex flex-col gap-2 border p-5">
          <p className="text-ink flex items-center gap-2 text-[13px]">
            <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
            La baraja todavía no cumple las reglas del formato
          </p>
          <ul className="text-muted flex flex-col gap-1 text-[13px]">
            {issues.map((i, n) => (
              <li key={`${i.code}-${n}`}>· {i.mensaje}</li>
            ))}
          </ul>
        </div>
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
      <CardModal card={vista} onClose={() => setVista(null)} />

      <ConfirmDialog
        open={porBorrar}
        titulo="¿Borrar la baraja?"
        mensaje={`"${deckTitle(deck)}" se borra de este navegador y no hay de donde recuperarlo.`}
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
