"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Flag, Link2, LogOut, Trophy, Undo2 } from "lucide-react";

import { ConCatalogo } from "../ConCatalogo";
import { ConfirmDialog } from "../ConfirmDialog";
import { TarjetaBaraja } from "../decks/TarjetaBaraja";
import { CabeceraSala } from "./CabeceraSala";
import { recargarSiHaceFalta } from "./documento-de-la-mesa";
import { EntreJuegos } from "./EntreJuegos";
import { Enfrentamiento } from "./Enfrentamiento";
import { MesaEnLinea } from "./MesaEnLinea";
import { useDecks } from "../decks/use-decks";
import { DeckListSkeleton } from "../Skeleton";
import { toast } from "../toast";
import {
  guardarBaraja,
  latido,
  marcarLista,
  mensajeDeSala,
  salirDeSala,
  verSala,
} from "./sala-api";
import { indiceDe, isLegal, validateDeck } from "@/lib/deck-rules";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import { miLado, NOMBRE_ESTADO_SALA, nombreEnSala, type Sala } from "@/lib/mesa/sala";
import type { Card, Formato } from "@/lib/types";
import {
  AVISO_EN_LINEA,
  BOTON_ICONO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  ENLACE,
  HOVER_PELIGRO,
  VACIO,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

/** Cada cuanto se pregunta por la sala. El tiempo real llega en la sesion 5. */
const CADA_MS = 3000;
/** Cada cuanto se da la senal de vida (GAME.md §2: dos minutos de gracia). */
const LATIDO_MS = 20_000;

/**
 * Una sala: su codigo para compartir, los dos jugadores, y la baraja con que
 * entra cada uno, que tiene que cumplir en el formato de la sala.
 */
export function SalaDetalle({ id, uid }: { id: string; uid: string }) {
  const [sala, setSala] = useState<Sala | null | "cargando">("cargando");
  const [error, setError] = useState<string | null>(null);
  /** Cuando llego la ultima respuesta, en el reloj de este navegador (sesion 6). */
  const [recibida, setRecibida] = useState(0);

  const refrescar = useCallback(async () => {
    try {
      const nueva = await verSala(id);
      setRecibida(Date.now());
      setSala(nueva);
      setError(null);
    } catch (e) {
      setError(mensajeDeSala(e));
    }
  }, [id]);

  // Una sala abierta desde otra pagina del sitio (la navbar, la vuelta de
  // Google) hereda una CSP sin el wss:// del tiempo real: se recarga.
  useEffect(() => {
    recargarSiHaceFalta();
  }, []);

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
        sala.estado === "terminada" ? (
          <SalaTerminada sala={sala} uid={uid} />
        ) : // Con los dos listos, la sala es la mesa (sesion 5).
        sala.estado === "entre_juegos" && miLado(sala, uid) ? (
          <EntreJuegos
            sala={sala}
            uid={uid}
            recibida={recibida}
            deFormato={deFormato}
            refrescar={refrescar}
          />
        ) : sala.estado === "jugando" && miLado(sala, uid) ? (
          <MesaEnLinea
            // Cada juego monta la mesa de nuevo, con su ronda.
            key={sala.ronda}
            mesa={sala.id}
            codigo={sala.codigo}
            lado={miLado(sala, uid) ?? "a"}
            uid={uid}
            formato={sala.formato}
            nombres={{ a: nombreEnSala(sala, "a"), b: nombreEnSala(sala, "b") }}
            cards={deFormato(sala.formato)}
            sala={sala}
            recibida={recibida}
            refrescar={() => void refrescar()}
          />
        ) : (
          <SalaAbierta
            sala={sala}
            uid={uid}
            recibida={recibida}
            error={error}
            deFormato={deFormato}
            refrescar={refrescar}
          />
        )
      }
    </ConCatalogo>
  );
}

/**
 * La serie termino: jugando, porque alguien se rindio en el juego que la
 * decidia, o por abandono (sesiones 6 y 7). La partida ya se borro de la
 * base; queda solo el marcador, quien gano y por que.
 */
function SalaTerminada({ sala, uid }: { sala: Sala; uid: string }) {
  const lado = miLado(sala, uid);
  const gane = sala.ganador === uid;
  const rival = lado === "a" ? nombreEnSala(sala, "b") : nombreEnSala(sala, "a");
  const mias = lado === "b" ? sala.victorias_b : sala.victorias_a;
  const suyas = lado === "b" ? sala.victorias_a : sala.victorias_b;
  const marcador = `${mias} – ${suyas}`;
  let titulo = gane
    ? "Ganaste la serie"
    : sala.ganador
      ? "Perdiste la serie"
      : "Serie terminada";
  let porque: string | null = null;
  if (sala.motivo === "abandono") {
    titulo += gane ? `: ${rival} abandonó` : " por abandono";
    porque = gane
      ? `${rival} se desconectó y no volvió en dos minutos.`
      : "Te desconectaste y no volviste en dos minutos.";
  } else if (sala.motivo === "retiro") {
    if (gane) {
      titulo += `: ${rival} abandonó`;
      porque = `${rival} dejó la serie.`;
    } else {
      titulo = "Abandonaste la serie";
      porque = `La serie es para ${rival}.`;
    }
  } else if (sala.motivo === "partidas" || sala.motivo === "rendicion") {
    titulo += ` ${marcador}`;
    porque =
      sala.motivo === "rendicion"
        ? gane
          ? `${rival} se rindió en el último juego.`
          : "Te rendiste en el último juego."
        : `Al mejor de ${sala.mejor_de}.`;
  }
  return (
    <section
      aria-labelledby="sala-titulo"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center"
    >
      {gane ? (
        <Trophy size={40} aria-hidden="true" className="text-accent" />
      ) : (
        <Flag size={40} aria-hidden="true" className="text-muted" />
      )}
      <h1 id="sala-titulo" className="text-ink text-2xl font-bold tabular-nums">
        {titulo}
      </h1>
      {porque && <p className="text-muted text-[15px]">{porque}</p>}
      <p className="text-muted text-[14px]">
        Sala <span className="font-mono tracking-[0.15em]">{sala.codigo}</span> ·{" "}
        {NOMBRE_FORMATO[sala.formato]} · al mejor de {sala.mejor_de}
      </p>
      <Link href="/mesa/" className={cn(BOTON_PRIMARIO, "mt-2")}>
        Volver a la mesa
      </Link>
    </section>
  );
}

interface SalaAbiertaProps {
  sala: Sala;
  uid: string;
  /** Cuando llego la ultima respuesta, en el reloj de este navegador. */
  recibida: number;
  error: string | null;
  deFormato: (f: Formato) => Card[];
  refrescar: () => Promise<void>;
}

function SalaAbierta({
  sala,
  uid,
  recibida,
  error,
  deFormato,
  refrescar,
}: SalaAbiertaProps) {
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

  // Las barajas se eligen con las tarjetas de Mis barajas, validadas con el
  // formato de la SALA: la pastilla dice si cumplen ahi.
  const indiceSala = indiceDe(deFormato(sala.formato), sala.formato);
  const listoConBaraja = listo ? (decks.find((d) => d.id === elegida) ?? null) : null;
  const visibles = listo ? (listoConBaraja ? [listoConBaraja] : []) : decks;

  return (
    <section aria-labelledby="sala-titulo" className="flex flex-col gap-10">
      <CabeceraSala
        titulo={`Sala ${sala.codigo}`}
        formato={sala.formato}
        subtitulo={
          <p className="text-muted">
            {sala.jugador_b === null
              ? "Esperando rival"
              : esperando
                ? "Eligiendo barajas"
                : NOMBRE_ESTADO_SALA[sala.estado]}
          </p>
        }
        acciones={
          <>
            <button
              type="button"
              onClick={copiarEnlace}
              aria-label="Copiar enlace de la sala"
              title="Copiar enlace de la sala"
              className={BOTON_ICONO}
            >
              <Link2 size={16} aria-hidden="true" />
            </button>
            {esperando && lado && (
              <button
                type="button"
                onClick={() => setSaliendo(true)}
                disabled={ocupado}
                className={cn(BOTON_SECUNDARIO, HOVER_PELIGRO)}
              >
                <LogOut size={14} aria-hidden="true" />
                {lado === "a" ? "Cerrar la sala" : "Salir de la sala"}
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {error && (
          <p
            role="alert"
            className={cn(AVISO_EN_LINEA, "border-warning/60 bg-warning-soft text-ink")}
          >
            {error}
          </p>
        )}

        <Enfrentamiento
          sala={sala}
          uid={uid}
          recibida={recibida}
          modo={{ tipo: "sala" }}
        />
      </div>

      {esperando ? (
        <div className="flex flex-col gap-4">
          {/* Como Mis barajas: el titulo y, a su altura, el boton de la accion. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-ink text-xl font-semibold tracking-[-0.01em]">
                Tu baraja
              </h2>
              <p className="text-muted mt-1 text-[14px]">
                {listo
                  ? `Estás listo. Esperando a ${lado === "a" ? "tu rival" : "quien creó la sala"}.`
                  : `Tiene que cumplir en ${NOMBRE_FORMATO[sala.formato]}. Tu rival no ve tu lista.`}
              </p>
            </div>
            {decks.length > 0 &&
              (listo ? (
                <button
                  type="button"
                  onClick={() => hacer(() => marcarLista(sala.id, false))}
                  disabled={ocupado}
                  className={BOTON_SECUNDARIO}
                >
                  <Undo2 size={14} aria-hidden="true" />
                  Cambiar de baraja
                </button>
              ) : (
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
              ))}
          </div>

          {decks.length === 0 ? (
            <div className={VACIO}>
              <p className="text-ink">No tienes barajas guardadas.</p>
              <Link href="/constructor/" className={cn(ENLACE, "mt-2 inline-block")}>
                Armar una baraja
              </Link>
            </div>
          ) : (
            <>
              {!listo && legales.length === 0 && (
                <p className={AVISO_EN_LINEA}>
                  Ninguna de tus barajas cumple en {NOMBRE_FORMATO[sala.formato]}.
                </p>
              )}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibles.map((d) => (
                  <TarjetaBaraja
                    key={d.id}
                    deck={d}
                    index={indiceSala}
                    elegida={d.id === elegida}
                    noDisponible={listo ? null : (motivos.get(d.id) ?? null)}
                    onElegir={() => !listo && setElegida(d.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className={AVISO_EN_LINEA}>Los dos están listos: la sala está en juego.</p>
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
