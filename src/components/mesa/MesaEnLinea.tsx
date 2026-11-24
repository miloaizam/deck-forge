"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Wifi, WifiOff } from "lucide-react";

import { api } from "../nube/api";
import { token } from "../nube/nube";
import { DeckListSkeleton } from "../Skeleton";
import { TableroMesa } from "./TableroMesa";
import { useEscritorio } from "./use-escritorio";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Accion } from "@/lib/mesa/apply";
import { leerMensaje, type Lado, type Mensaje } from "@/lib/mesa/red";
import { newTable } from "@/lib/mesa/setup";
import { accionLocal, iniciar, mesaDe, recibir, type Red } from "@/lib/mesa/sincronia";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase-config";
import { deckSchema, type Card, type Formato } from "@/lib/types";
import { AVISO_EN_LINEA, ENLACE, VACIO } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** El canal de Supabase Realtime, tal como lo usa esta vista. */
interface Canal {
  send: (m: { type: "broadcast"; event: string; payload: unknown }) => Promise<unknown>;
  unsubscribe: () => Promise<unknown>;
}

/** Un azar repetible desde una semilla (mulberry32). */
function azarDe(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * La semilla con que esta pestana baraja su mitad. Se guarda para que
 * recargar arme la misma mitad, con las mismas cartas en los mismos uids, y
 * no otra que choque con la mesa que ya se esta jugando.
 */
function semillaDe(mesa: string): number {
  const clave = `deckforge-mesa-${mesa}`;
  try {
    const guardada = Number(sessionStorage.getItem(clave));
    if (Number.isInteger(guardada) && guardada > 0) return guardada;
  } catch {
    // Sin sessionStorage: una semilla nueva, que solo vale para esta carga.
  }
  const nueva = 1 + Math.floor(Math.random() * 2 ** 31);
  try {
    sessionStorage.setItem(clave, String(nueva));
  } catch {
    // Igual se juega; recargar armaria otra mitad.
  }
  return nueva;
}

type Fase =
  { fase: "preparando" } | { fase: "error"; mensaje: string } | { fase: "lista" };

interface MesaEnLineaProps {
  mesa: string;
  codigo: string;
  lado: Lado;
  uid: string;
  formato: Formato;
  nombres: Record<Lado, string>;
  /** El catalogo con las erratas del formato de la sala. */
  cards: Card[];
}

/**
 * La mesa del 1v1 (GAME.md, sesion 5). Cada navegador prepara su mitad con
 * la baraja que guardo en su fila privada, se conecta al canal privado de la
 * sala y desde ahi todo pasa por `sincronia.ts`: aqui solo se llevan y traen
 * los mensajes. El cliente de tiempo real se carga recien aqui, diferido.
 */
export function MesaEnLinea(props: MesaEnLineaProps) {
  const escritorio = useEscritorio();
  if (escritorio === null) return <DeckListSkeleton />;
  if (!escritorio) {
    return (
      <div className={VACIO}>
        <Monitor size={28} aria-hidden="true" className="text-accent mx-auto" />
        <p className="text-ink mt-3 font-bold">La mesa es para escritorio</p>
        <p className="text-muted mt-2 text-[14px]">
          Entra a esta sala desde una pantalla de al menos 1024 píxeles de ancho.
        </p>
      </div>
    );
  }
  return <Conectada {...props} />;
}

function Conectada({
  mesa,
  codigo,
  lado,
  uid,
  formato,
  nombres,
  cards,
}: MesaEnLineaProps) {
  const cartas = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [estado, setEstado] = useState<Fase>({ fase: "preparando" });
  const [red, setRed] = useState<Red | null>(null);
  const [rivalConectado, setRivalConectado] = useState(false);
  const redRef = useRef<Red | null>(null);
  const canalRef = useRef<Canal | null>(null);
  const azar = useRef<() => number>(Math.random);

  /** Aplica un paso de la sincronia: guarda el estado y manda lo que toque. */
  const avanzar = useCallback((paso: { red: Red; enviar: Mensaje[] }) => {
    redRef.current = paso.red;
    setRed(paso.red);
    for (const m of paso.enviar) {
      void canalRef.current?.send({ type: "broadcast", event: "m", payload: m });
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    let canal: Canal | null = null;
    let cliente: { disconnect: () => unknown } | null = null;

    (async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("La nube está apagada.");
      const t = await token();
      if (!t) throw new Error("Inicia sesión para jugar.");

      // La baraja elegida, de la fila privada propia (la de nadie mas se lee).
      const filas = await api(
        `mesas_privado?select=estado&mesa=eq.${mesa}&jugador=eq.${uid}`,
        { token: t },
      );
      const fila: unknown = Array.isArray(filas) ? filas[0] : null;
      const datos =
        typeof fila === "object" &&
        fila &&
        "estado" in fila &&
        typeof fila.estado === "object"
          ? fila.estado
          : null;
      const baraja = deckSchema.safeParse(
        datos && "baraja" in datos ? datos.baraja : null,
      );
      if (!baraja.success) throw new Error("No se encontró tu baraja para esta sala.");

      const semilla = semillaDe(mesa);
      const miMitad = newTable([{ id: lado, deck: baraja.data }], azarDe(semilla));
      azar.current = azarDe(semilla ^ 0x5bd1e995);

      const { RealtimeClient } = await import("@supabase/realtime-js");
      if (!vivo) return;
      const rc = new RealtimeClient(`${SUPABASE_URL}/realtime/v1`, {
        params: { apikey: SUPABASE_KEY },
        accessToken: () => token(),
        // El protocolo en JSON, el que se probo contra el proyecto en la
        // sesion 0: el 2.0.0 manda los broadcast en binario.
        vsn: "1.0.0",
      });
      cliente = rc;
      const ch = rc.channel(`mesa:${mesa}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: lado } },
      });
      canal = ch;
      ch.on("broadcast", { event: "m" }, ({ payload }) => {
        const msg = leerMensaje(payload);
        const actual = redRef.current;
        if (!msg || !actual) return;
        avanzar(recibir(actual, msg, azar.current));
      });
      ch.on("presence", { event: "sync" }, () => {
        const estados = ch.presenceState();
        setRivalConectado(Object.keys(estados).some((k) => k !== lado));
      });
      ch.subscribe((status) => {
        if (!vivo) return;
        if (status === "SUBSCRIBED") {
          canalRef.current = ch;
          void ch.track({ lado });
          setEstado({ fase: "lista" });
          avanzar(iniciar(lado, miMitad));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setEstado({ fase: "error", mensaje: "No se pudo conectar a la mesa." });
        }
      });
    })().catch((e: unknown) => {
      if (vivo) {
        setEstado({
          fase: "error",
          mensaje: e instanceof Error ? e.message : "No se pudo preparar la mesa.",
        });
      }
    });

    return () => {
      vivo = false;
      canalRef.current = null;
      void canal?.unsubscribe();
      cliente?.disconnect();
    };
  }, [mesa, uid, lado, avanzar]);

  const hacer = useCallback(
    (accion: Accion) => {
      const actual = redRef.current;
      if (actual) avanzar(accionLocal(actual, accion, azar.current));
    },
    [avanzar],
  );

  const rival: Lado = lado === "a" ? "b" : "a";
  const tablero = red ? mesaDe(red) : null;
  const conexion = (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[13px]",
        rivalConectado ? "text-success" : "text-warning",
      )}
    >
      {rivalConectado ? (
        <Wifi size={14} aria-hidden="true" />
      ) : (
        <WifiOff size={14} aria-hidden="true" />
      )}
      {nombres[rival]} {rivalConectado ? "está conectado" : "no está conectado"}
    </p>
  );
  const cabecera = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <h1 className="text-ink mr-auto text-lg font-bold">
        Sala <span className="font-mono tracking-[0.15em]">{codigo}</span>{" "}
        <span className="text-muted text-[14px] font-normal">
          · {NOMBRE_FORMATO[formato]} · {nombres[lado]} contra {nombres[rival]}
        </span>
      </h1>
      {conexion}
      <Link href="/mesa/" className={cn(ENLACE, "text-[14px]")}>
        Salir de la mesa
      </Link>
    </div>
  );

  if (estado.fase === "error") {
    return (
      <div className={VACIO}>
        <p className="text-ink">{estado.mensaje}</p>
        <Link href="/mesa/" className={cn(ENLACE, "mt-2 inline-block")}>
          Volver a la mesa
        </Link>
      </div>
    );
  }
  if (!tablero) {
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <p className={AVISO_EN_LINEA}>
          Los dos están listos: la sala está en juego. Preparando la mesa
          {rivalConectado ? "…" : `: esperando a que ${nombres[rival]} entre.`}
        </p>
      </div>
    );
  }
  return (
    <TableroMesa
      mesa={tablero}
      yo={lado}
      hacer={hacer}
      cartas={cartas}
      formato={formato}
      cabecera={cabecera}
      nombreJugador={(id) => (id === lado ? "Tú" : nombres[rival])}
    />
  );
}
