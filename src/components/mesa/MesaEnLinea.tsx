"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import { Hourglass, Monitor, Wifi, WifiOff } from "lucide-react";

import { token } from "../nube/nube";
import { DeckListSkeleton } from "../Skeleton";
import {
  guardarMesaPublica,
  guardarPrivado,
  leerMesaPublica,
  leerPrivado,
  reclamarAbandono,
} from "./sala-api";
import { TableroMesa } from "./TableroMesa";
import { useEscritorio } from "./use-escritorio";
import { NOMBRE_FORMATO } from "@/lib/formatos";
import type { Accion } from "@/lib/mesa/apply";
import {
  esCoherente,
  leerMensaje,
  mesaVistaSchema,
  type Lado,
  type Mensaje,
} from "@/lib/mesa/red";
import { restanteDeGracia, type Sala } from "@/lib/mesa/sala";
import { newTable } from "@/lib/mesa/setup";
import {
  accionLocal,
  iniciar,
  mesaDe,
  reconectar,
  recibir,
  type Red,
} from "@/lib/mesa/sincronia";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase-config";
import { deckSchema, type Card, type Formato } from "@/lib/types";
import type { MesaVista } from "@/lib/mesa/vista";
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

/** Lo privado de cada jugador en la sala: su baraja y la semilla de su barajado. */
const privadoSchema = z.object({
  baraja: deckSchema,
  semilla: z.optional(z.int().check(z.minimum(1), z.maximum(2 ** 31))),
});

/** Cuanto se espera, quieta la mesa, para guardar la foto (sesion 6). */
const GUARDAR_QUIETA_MS = 2000;
/** Cada cuantas versiones se guarda igual, aunque no se quede quieta. */
const GUARDAR_CADA = 10;

/** Los minutos y segundos que quedan, «1:43». */
function reloj(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
  /** La sala de la ultima consulta (cada 3 s): las senales de vida y la hora de la base. */
  sala: Sala;
  /** Cuando llego esa consulta, en ms del reloj de este navegador. */
  recibida: number;
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
  sala,
  recibida,
}: MesaEnLineaProps) {
  const cartas = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [estado, setEstado] = useState<Fase>({ fase: "preparando" });
  const [red, setRed] = useState<Red | null>(null);
  /** `null` hasta la primera lista de presencia: no se sabe todavia. */
  const [rivalConectado, setRivalConectado] = useState<boolean | null>(null);
  const redRef = useRef<Red | null>(null);
  const canalRef = useRef<Canal | null>(null);
  const azar = useRef<() => number>(Math.random);
  /** La ultima version guardada en la base, y el guardado en espera. */
  const guardadaV = useRef(0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const reclamando = useRef(false);
  const [intento, setIntento] = useState(0);

  /**
   * Guarda la foto publica de la mesa: al quedar quieta, o enseguida cada
   * pocas versiones. La guarda quien publico el cambio; la base descarta una
   * version que no sea mas nueva.
   */
  const programarGuardado = useCallback(
    (r: Red) => {
      if (!r.publica) return;
      const guardar = () => {
        const actual = redRef.current;
        if (!actual?.publica || actual.v <= guardadaV.current) return;
        const v = actual.v;
        guardarMesaPublica(mesa, v, actual.publica)
          .then(() => {
            guardadaV.current = Math.max(guardadaV.current, v);
          })
          .catch(() => {});
      };
      if (espera.current) clearTimeout(espera.current);
      if (r.v - guardadaV.current >= GUARDAR_CADA) guardar();
      else espera.current = setTimeout(guardar, GUARDAR_QUIETA_MS);
    },
    [mesa],
  );

  /** Aplica un paso de la sincronia: guarda el estado y manda lo que toque. */
  const avanzar = useCallback(
    (paso: { red: Red; enviar: Mensaje[] }) => {
      redRef.current = paso.red;
      setRed(paso.red);
      for (const m of paso.enviar) {
        void canalRef.current?.send({ type: "broadcast", event: "m", payload: m });
      }
      if (paso.enviar.some((m) => m.t === "estado" && m.v === paso.red.v)) {
        programarGuardado(paso.red);
      }
    },
    [programarGuardado],
  );

  useEffect(() => {
    let vivo = true;
    let canal: Canal | null = null;
    let cliente: { disconnect: () => unknown } | null = null;

    (async () => {
      if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("La nube está apagada.");
      const t = await token();
      if (!t) throw new Error("Inicia sesión para jugar.");

      // La baraja elegida y la semilla del barajado, de la fila privada
      // propia (la de nadie mas se lee). La misma semilla arma la misma
      // mitad, con las mismas cartas en los mismos uids, en cualquier pestana.
      const privado = privadoSchema.safeParse(await leerPrivado(mesa, uid));
      if (!privado.success) throw new Error("No se encontró tu baraja para esta sala.");
      const { baraja } = privado.data;
      let semilla = privado.data.semilla;
      if (!semilla) {
        semilla = 1 + Math.floor(Math.random() * (2 ** 31 - 1));
        await guardarPrivado(mesa, uid, { baraja, semilla });
      }
      const miMitad = newTable([{ id: lado, deck: baraja }], azarDe(semilla));
      azar.current = azarDe(semilla ^ 0x5bd1e995);

      // La foto guardada, si ya se estaba jugando (se recargo, o se fueron
      // los dos): se arranca desde ella.
      let guardada: { v: number; publica: MesaVista } | null = null;
      const foto = await leerMesaPublica(mesa);
      const leida = foto ? mesaVistaSchema.safeParse(foto.estado) : null;
      const version = foto?.version;
      if (
        leida?.success &&
        esCoherente(leida.data) &&
        typeof version === "number" &&
        Number.isInteger(version) &&
        version > 0
      ) {
        guardada = { v: version, publica: leida.data };
        guardadaV.current = version;
      }

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
      let primera = true;
      ch.subscribe((status) => {
        if (!vivo) return;
        if (status === "SUBSCRIBED") {
          canalRef.current = ch;
          void ch.track({ lado });
          setEstado({ fase: "lista" });
          if (primera) {
            primera = false;
            avanzar(iniciar(lado, miMitad, guardada));
          } else if (redRef.current) {
            // Volvio la conexion (Realtime reintenta solo): ponerse al dia.
            avanzar(reconectar(redRef.current));
          }
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
      if (espera.current) clearTimeout(espera.current);
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
  const jugando = tablero !== null && rivalConectado === false;

  // Con el rival desconectado, la cuenta regresiva avanza cada segundo.
  useEffect(() => {
    if (!jugando) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [jugando]);

  const restante = jugando ? restanteDeGracia(sala, rival, recibida, ahora) : null;

  // Se acabo el tiempo: la serie para quien siguio conectado. Lo decide la
  // base con su hora; si todavia no, se vuelve a intentar en un rato.
  useEffect(() => {
    if (restante !== 0 || reclamando.current) return;
    reclamando.current = true;
    reclamarAbandono(mesa).catch(() => {
      setTimeout(() => {
        reclamando.current = false;
        setIntento((n) => n + 1);
      }, 5000);
    });
  }, [restante, mesa, intento]);

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

  const cuenta =
    restante !== null ? (
      <p
        role="status"
        className={cn(
          AVISO_EN_LINEA,
          "border-warning/60 bg-warning-soft text-ink items-center",
        )}
      >
        <Hourglass size={16} aria-hidden="true" className="text-warning" />
        {restante > 0
          ? `${nombres[rival]} se desconectó. Si no vuelve en ${reloj(restante)}, la serie es tuya.`
          : `${nombres[rival]} no volvió: la serie es tuya.`}
      </p>
    ) : null;

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
      aviso={cuenta}
      nombreJugador={(id) => (id === lado ? "Tú" : nombres[rival])}
    />
  );
}
