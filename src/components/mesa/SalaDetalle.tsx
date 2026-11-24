"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, DoorOpen, Hourglass, LogOut, Undo2 } from "lucide-react";

import { ConCatalogo } from "../ConCatalogo";
import { ConfirmDialog } from "../ConfirmDialog";
import { MesaEnLinea } from "./MesaEnLinea";
import { useDecks } from "../decks/use-decks";
import { DeckListSkeleton } from "../Skeleton";
import { Select } from "../Select";
import { toast } from "../toast";
import {
  guardarBaraja,
  latido,
  marcarLista,
  mensajeDeSala,
  salirDeSala,
  verSala,
} from "./sala-api";
import { deckTitle } from "@/lib/deck";
import { indiceDe, isLegal, validateDeck } from "@/lib/deck-rules";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import { miLado, NOMBRE_ESTADO_SALA, nombreEnSala, type Sala } from "@/lib/mesa/sala";
import type { Card, Formato } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  ENLACE,
  HOVER_PELIGRO,
  PASTILLA,
  VACIO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

/** Cada cuanto se pregunta por la sala. El tiempo real llega en la sesion 5. */
const CADA_MS = 3000;
/** Cada cuanto se da la senal de vida (GAME.md §2: dos minutos de gracia). */
const LATIDO_MS = 20_000;

const PANEL = "border-line bg-panel rounded-panel border p-5 sm:p-6";

/**
 * Una sala: su codigo para compartir, los dos jugadores, y la baraja con que
 * entra cada uno, que tiene que cumplir en el formato de la sala.
 */
export function SalaDetalle({ id, uid }: { id: string; uid: string }) {
  const [sala, setSala] = useState<Sala | null | "cargando">("cargando");
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    try {
      setSala(await verSala(id));
      setError(null);
    } catch (e) {
      setError(mensajeDeSala(e));
    }
  }, [id]);

  useEffect(() => {
    // La primera pregunta, tambien desde un temporizador: la sala es un
    // sistema externo y su respuesta entra como la de las siguientes.
    const primera = setTimeout(() => void refrescar(), 0);
    const t = setInterval(() => void refrescar(), CADA_MS);
    const l = setInterval(() => void latido(id).catch(() => {}), LATIDO_MS);
    void latido(id).catch(() => {});
    return () => {
      clearTimeout(primera);
      clearInterval(t);
      clearInterval(l);
    };
  }, [id, refrescar]);

  if (sala === "cargando") {
    return error ? <p className={VACIO}>{error}</p> : <DeckListSkeleton />;
  }
  if (sala === null) {
    return (
      <div className={VACIO}>
        <p className="text-ink">Esta sala no existe o no eres parte de ella.</p>
        <Link href="/mesa/" className={cn(ENLACE, "mt-2 inline-block")}>
          Volver a la mesa
        </Link>
      </div>
    );
  }
  return (
    <ConCatalogo esqueleto={<DeckListSkeleton />}>
      {(_, deFormato) =>
        // Con los dos listos, la sala es la mesa (sesion 5).
        sala.estado === "jugando" && miLado(sala, uid) ? (
          <MesaEnLinea
            mesa={sala.id}
            codigo={sala.codigo}
            lado={miLado(sala, uid) ?? "a"}
            uid={uid}
            formato={sala.formato}
            nombres={{ a: nombreEnSala(sala, "a"), b: nombreEnSala(sala, "b") }}
            cards={deFormato(sala.formato)}
          />
        ) : (
          <SalaAbierta
            sala={sala}
            uid={uid}
            error={error}
            deFormato={deFormato}
            refrescar={refrescar}
          />
        )
      }
    </ConCatalogo>
  );
}

interface SalaAbiertaProps {
  sala: Sala;
  uid: string;
  error: string | null;
  deFormato: (f: Formato) => Card[];
  refrescar: () => Promise<void>;
}

function SalaAbierta({ sala, uid, error, deFormato, refrescar }: SalaAbiertaProps) {
  const router = useRouter();
  const decks = useDecks();
  const [elegida, setElegida] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const lado = miLado(sala, uid);
  const listo = lado === "a" ? sala.listo_a : sala.listo_b;
  const esperando = sala.estado === "esperando";

  // Que cumpla en el formato de la SALA, que es el que se juega: no el que
  // la baraja tenga puesto.
  const motivos = useMemo(() => {
    const indice = indiceDe(deFormato(sala.formato), sala.formato);
    const m = new Map<string, string | null>();
    for (const d of decks) {
      const issues = validateDeck(d, indice);
      m.set(
        d.id,
        isLegal(issues)
          ? null
          : (issues.find((i) => i.gravedad === "error")?.mensaje ?? "No cumple."),
      );
    }
    return m;
  }, [decks, deFormato, sala.formato]);

  const legales = decks.filter((d) => motivos.get(d.id) === null);
  const baraja = decks.find((d) => d.id === elegida) ?? null;

  async function hacer(fn: () => Promise<void>, despues?: string) {
    setOcupado(true);
    try {
      await fn();
      await refrescar();
      if (despues) toast(despues, "success");
    } catch (e) {
      toast(mensajeDeSala(e), "warning");
    } finally {
      setOcupado(false);
    }
  }

  async function copiarEnlace() {
    const enlace = `${window.location.origin}/mesa/?c=${sala.codigo}`;
    try {
      await navigator.clipboard.writeText(enlace);
      toast("Enlace de la sala copiado.", "info");
    } catch {
      toast(`No se pudo copiar. El enlace es ${enlace}`, "warning");
    }
  }

  const jugador = (l: "a" | "b") => {
    const presente = l === "a" || sala.jugador_b !== null;
    const estaListo = l === "a" ? sala.listo_a : sala.listo_b;
    return (
      <li className="border-line flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3">
        <span className="text-ink font-medium">
          {presente ? nombreEnSala(sala, l) : "Esperando rival…"}
          {l === lado && <span className="text-muted ml-1.5 text-[13px]">(tú)</span>}
        </span>
        {presente && (
          <span className={cn(PASTILLA, estaListo ? "text-success" : "text-muted")}>
            {estaListo ? (
              <Check size={12} aria-hidden="true" />
            ) : (
              <Hourglass size={12} aria-hidden="true" />
            )}
            {estaListo ? "Listo" : "Eligiendo baraja"}
          </span>
        )}
      </li>
    );
  };

  return (
    <section
      aria-labelledby="sala-titulo"
      className="mx-auto flex max-w-3xl flex-col gap-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/mesa/" className={cn(ENLACE, "text-[14px]")}>
            ← Mesa
          </Link>
          <h1
            id="sala-titulo"
            className="text-ink mt-1 flex items-center gap-2 text-2xl font-bold"
          >
            <DoorOpen size={22} aria-hidden="true" className="text-accent" />
            Sala <span className="font-mono tracking-[0.15em]">{sala.codigo}</span>
          </h1>
          <p className="text-muted mt-1 text-[14px]">
            {NOMBRE_FORMATO[sala.formato]} · al mejor de {sala.mejor_de} ·{" "}
            {NOMBRE_ESTADO_SALA[sala.estado]}
          </p>
        </div>
        <button type="button" onClick={copiarEnlace} className={BOTON_SECUNDARIO}>
          <Copy size={14} aria-hidden="true" />
          Copiar enlace
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className={cn(AVISO_EN_LINEA, "border-warning/60 bg-warning-soft text-ink")}
        >
          {error}
        </p>
      )}

      <div className={PANEL}>
        <h2 className="text-ink text-lg font-bold">Jugadores</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {jugador("a")}
          {jugador("b")}
        </ul>
        {esperando && sala.jugador_b === null && (
          <p className="text-muted mt-3 text-[14px]">
            Comparte el código{" "}
            <strong className="text-ink font-mono">{sala.codigo}</strong> o el enlace con
            tu rival.
          </p>
        )}
      </div>

      {esperando ? (
        <div className={PANEL}>
          <h2 className="text-ink text-lg font-bold">Tu baraja</h2>
          {listo ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink text-[14px]">
                Estás listo. Esperando a{" "}
                {lado === "a" ? "tu rival" : "quien creó la sala"}.
              </p>
              <button
                type="button"
                onClick={() => hacer(() => marcarLista(sala.id, false))}
                disabled={ocupado}
                className={BOTON_SECUNDARIO}
              >
                <Undo2 size={14} aria-hidden="true" />
                Cambiar de baraja
              </button>
            </div>
          ) : (
            <>
              <p className="text-muted mt-1 text-[14px]">
                Tiene que cumplir en {NOMBRE_FORMATO[sala.formato]}. Tu rival no ve tu
                lista.
              </p>
              {decks.length === 0 ? (
                <p className="text-muted mt-3 text-[14px]">
                  No tienes barajas guardadas.{" "}
                  <Link href="/constructor/" className={ENLACE}>
                    Armar una
                  </Link>
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Select
                    label="Baraja"
                    requerido
                    value={elegida}
                    options={["", ...decks.map((d) => d.id)]}
                    onChange={setElegida}
                    format={(v) =>
                      v === ""
                        ? "Elige una baraja"
                        : deckTitle(decks.find((d) => d.id === v) ?? decks[0])
                    }
                    deshabilitada={(v) =>
                      v === "" ? "Elige una" : (motivos.get(v) ?? null)
                    }
                    className="min-w-64 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      baraja &&
                      hacer(async () => {
                        await guardarBaraja(sala.id, uid, baraja);
                        await marcarLista(sala.id, true);
                      }, "Listo para jugar.")
                    }
                    disabled={ocupado || !baraja || motivos.get(baraja.id) !== null}
                    className={BOTON_PRIMARIO}
                  >
                    <Check size={16} aria-hidden="true" />
                    Estoy listo
                  </button>
                </div>
              )}
              {decks.length > 0 && legales.length === 0 && (
                <p className="text-muted mt-3 text-[13px]">
                  Ninguna de tus barajas cumple en {NOMBRE_FORMATO[sala.formato]}.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className={cn(AVISO_EN_LINEA)}>Los dos están listos: la sala está en juego.</p>
      )}

      {esperando && lado && (
        <div>
          <button
            type="button"
            onClick={() => setSaliendo(true)}
            disabled={ocupado}
            className={cn(BOTON_SECUNDARIO, HOVER_PELIGRO)}
          >
            <LogOut size={14} aria-hidden="true" />
            {lado === "a" ? "Cerrar la sala" : "Salir de la sala"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={saliendo}
        titulo={lado === "a" ? "¿Cerrar la sala?" : "¿Salir de la sala?"}
        mensaje={
          lado === "a"
            ? "La sala se borra y su código deja de servir."
            : "Tu lugar queda libre para otra persona."
        }
        confirmar={lado === "a" ? "Cerrar" : "Salir"}
        onCancel={() => setSaliendo(false)}
        onConfirm={() => {
          setSaliendo(false);
          void hacer(
            async () => {
              await salirDeSala(sala.id);
              router.push("/mesa/");
            },
            lado === "a" ? "Sala cerrada." : "Saliste de la sala.",
          );
        }}
      />
    </section>
  );
}
