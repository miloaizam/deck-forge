"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as z from "zod/mini";
import {
  Flag,
  Hourglass,
  LogOut,
  Monitor,
  RotateCw,
  Scale,
  Wifi,
  WifiOff,
} from "lucide-react";

import { ConfirmDialog } from "../ConfirmDialog";
import { token } from "../nube/nube";
import { DeckListSkeleton } from "../Skeleton";
import { toast } from "../toast";
import { DialogoResultado, type Eleccion } from "./DialogoResultado";
import {
  abandonarSala,
  declararResultado,
  guardarMesaPublica,
  guardarPrivado,
  leerMesaPublica,
  leerPrivado,
  mensajeDeSala,
  rendirse,
  responderResultado,
} from "./sala-api";
import { TableroMesa } from "./TableroMesa";
import { reloj, useAbandono } from "./use-abandono";
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
import type { Sala } from "@/lib/mesa/sala";
import { numeroDeJuego, semillaDeRonda, type Resultado } from "@/lib/mesa/serie";
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
import {
  AVISO_EN_LINEA,
  BOTON_PRIMARIO_COMPACTO,
  BOTON_SECUNDARIO_COMPACTO,
  ENLACE,
  HOVER_AVISO,
  HOVER_PELIGRO,
  VACIO,
} from "@/lib/ui";
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
 * Lo privado de cada jugador en la sala: la baraja con que entro, la semilla
 * de su barajado y, desde el segundo juego, la baraja con los cambios del
 * side (sesion 7).
 */
const privadoSchema = z.object({
  baraja: deckSchema,
  semilla: z.optional(z.int().check(z.minimum(1), z.maximum(2 ** 31))),
  actual: z.optional(deckSchema),
});

/** Lo que va por el canal lleva la ronda: un mensaje de otro juego no se usa. */
const conRonda = (r: number, m: object) => ({ ...m, r });

/** El aviso «algo cambio en la sala, pregunta», tras declarar o responder. */
const AVISO_SALA = "sala";

/** Cuanto se espera, quieta la mesa, para guardar la foto (sesion 6). */
const GUARDAR_QUIETA_MS = 2000;
/** Cada cuantas versiones se guarda igual, aunque no se quede quieta. */
const GUARDAR_CADA = 10;

/**
 * preparando: todavia sin canal; lista: en el canal; reconectando: se cayo el
 * canal con la mesa ya en pantalla (se reintenta sin taparla); error: no se
 * pudo, con un boton para reintentar.
 */
type Fase =
  | { fase: "preparando" }
  | { fase: "error"; mensaje: string }
  | { fase: "lista" }
  | { fase: "reconectando" };

/**
 * Cuantas veces se intenta unirse al canal antes de mostrar el error, si
 * todavia no hay mesa. Con la mesa en pantalla se reintenta sin limite.
 */
const INTENTOS = 3;

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
  /** Vuelve a preguntar por la sala, tras declarar o responder un resultado. */
  refrescar: () => void;
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
  refrescar,
}: MesaEnLineaProps) {
  // La ronda no cambia mientras la mesa esta montada: un juego nuevo la monta
  // de nuevo (SalaDetalle le da la ronda como `key`).
  const [ronda] = useState(sala.ronda);
  const refrescarRef = useRef(refrescar);
  useEffect(() => {
    refrescarRef.current = refrescar;
  }, [refrescar]);
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
  const [terminando, setTerminando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [abandonando, setAbandonando] = useState(false);
  /** Cada intento de conexion rearma el canal entero (es la clave del efecto). */
  const [intento, setIntento] = useState(0);
  /** Los fallos seguidos antes de tener mesa: al tercero, se muestra el error. */
  const fallos = useRef(0);
  const [ocupado, setOcupado] = useState(false);

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
        guardarMesaPublica(mesa, ronda, v, actual.publica)
          .then(() => {
            guardadaV.current = Math.max(guardadaV.current, v);
          })
          .catch(() => {});
      };
      if (espera.current) clearTimeout(espera.current);
      if (r.v - guardadaV.current >= GUARDAR_CADA) guardar();
      else espera.current = setTimeout(guardar, GUARDAR_QUIETA_MS);
    },
    [mesa, ronda],
  );

  /** Aplica un paso de la sincronia: guarda el estado y manda lo que toque. */
  const avanzar = useCallback(
    (paso: { red: Red; enviar: Mensaje[] }) => {
      redRef.current = paso.red;
      setRed(paso.red);
      for (const m of paso.enviar) {
        void canalRef.current?.send({
          type: "broadcast",
          event: "m",
          payload: conRonda(ronda, m),
        });
      }
      if (paso.enviar.some((m) => m.t === "estado" && m.v === paso.red.v)) {
        programarGuardado(paso.red);
      }
    },
    [programarGuardado, ronda],
  );

  useEffect(() => {
    let vivo = true;
    let canal: Canal | null = null;
    let reintento: ReturnType<typeof setTimeout> | null = null;
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
      const { baraja, actual } = privado.data;
      let semilla = privado.data.semilla;
      if (!semilla) {
        semilla = 1 + Math.floor(Math.random() * (2 ** 31 - 1));
        await guardarPrivado(mesa, uid, {
          baraja,
          semilla,
          ...(actual ? { actual } : {}),
        });
      }
      // Cada juego, con los cambios del side que lleve, y barajado distinto.
      const deRonda = semillaDeRonda(semilla, ronda);
      const miMitad = newTable([{ id: lado, deck: actual ?? baraja }], azarDe(deRonda));
      azar.current = azarDe(deRonda ^ 0x5bd1e995);

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
      // El token, ANTES de unirse. `subscribe()` lo pide en paralelo y arma
      // el mensaje de union sin esperarlo: si el websocket abre primero, la
      // union sale sin token, Realtime la trata como anonima y la politica
      // del canal privado la rechaza. Era el «No se pudo conectar a la
      // mesa» que salia a veces (25-11-2026).
      await rc.setAuth();
      if (!vivo) return;
      if (!rc.accessTokenValue) throw new Error("Inicia sesión para jugar.");

      const ch = rc.channel(`mesa:${mesa}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: lado } },
      });
      canal = ch;
      ch.on("broadcast", { event: "m" }, ({ payload }) => {
        if (typeof payload !== "object" || payload === null) return;
        if (!("r" in payload) || payload.r !== ronda) return;
        if ("t" in payload && payload.t === AVISO_SALA) {
          refrescarRef.current();
          return;
        }
        const msg = leerMensaje(payload);
        const actual = redRef.current;
        if (!msg || !actual) return;
        avanzar(recibir(actual, msg, azar.current));
      });
      ch.on("presence", { event: "sync" }, () => {
        const estados = ch.presenceState();
        setRivalConectado(Object.keys(estados).some((k) => k !== lado));
      });
      let conectado = false;
      ch.subscribe((status) => {
        if (!vivo) return;
        if (status === "SUBSCRIBED") {
          conectado = true;
          fallos.current = 0;
          canalRef.current = ch;
          void ch.track({ lado });
          setEstado({ fase: "lista" });
          // Con la mesa ya armada (volvio la conexion, o un intento nuevo),
          // ponerse al dia; si no, empezar.
          if (redRef.current) avanzar(reconectar(redRef.current));
          else avanzar(iniciar(lado, miMitad, guardada));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          conectado = false;
          canalRef.current = null;
          if (redRef.current) {
            // La mesa sigue en pantalla: se reintenta sin taparla.
            setEstado({ fase: "reconectando" });
          } else if (++fallos.current >= INTENTOS) {
            setEstado({ fase: "error", mensaje: "No se pudo conectar a la mesa." });
            return;
          }
          // Si Realtime no se repone solo en un rato, se rearma todo.
          if (reintento) clearTimeout(reintento);
          reintento = setTimeout(() => {
            if (vivo && !conectado) setIntento((n) => n + 1);
          }, 2000);
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
      if (reintento) clearTimeout(reintento);
      canalRef.current = null;
      void canal?.unsubscribe();
      cliente?.disconnect();
    };
  }, [mesa, uid, lado, avanzar, ronda, intento]);

  const hacer = useCallback(
    (accion: Accion) => {
      const actual = redRef.current;
      if (actual) avanzar(accionLocal(actual, accion, azar.current));
    },
    [avanzar],
  );

  const rival: Lado = lado === "a" ? "b" : "a";
  const tablero = red ? mesaDe(red) : null;
  const restante = useAbandono(
    mesa,
    sala,
    rival,
    recibida,
    tablero !== null && rivalConectado === false,
  );

  /** Declarar, responder o rendirse: lo decide la base, y se avisa al rival. */
  const enLaSala = useCallback(
    async (fn: () => Promise<void>, despues?: string) => {
      setOcupado(true);
      try {
        await fn();
        void canalRef.current?.send({
          type: "broadcast",
          event: "m",
          payload: conRonda(ronda, { t: AVISO_SALA, de: lado }),
        });
        refrescar();
        if (despues) toast(despues, "info");
      } catch (e) {
        toast(mensajeDeSala(e), "warning");
        refrescar();
      } finally {
        setOcupado(false);
      }
    },
    [ronda, lado, refrescar],
  );

  const elegir = (e: Eleccion) => {
    if (e === "rendirme") {
      void enLaSala(() => rendirse(mesa));
      return;
    }
    const ganador: Resultado = e === "empate" ? "empate" : e === "gane" ? lado : rival;
    void enLaSala(
      () => declararResultado(mesa, ganador),
      `Resultado declarado. Falta que ${nombres[rival]} lo confirme.`,
    );
  };

  const rivalUid = rival === "a" ? sala.jugador_a : sala.jugador_b;
  const declaroYo = sala.declara === uid;
  const declaroRival = sala.declara !== null && sala.declara === rivalUid;
  /** Lo declarado, dicho a quien lo lee. */
  const loDeclarado = (quien: "yo" | "rival"): string => {
    if (sala.declarado === "empate") return "empate";
    const ganoYo = sala.declarado === lado;
    if (quien === "yo") return ganoYo ? "que ganaste" : `que ganó ${nombres[rival]}`;
    return ganoYo ? "que ganaste tú" : "que ganó";
  };

  const enLinea = rivalConectado === true && estado.fase !== "reconectando";
  const conexion = (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[13px]",
        enLinea ? "text-success" : "text-warning",
      )}
    >
      {enLinea ? (
        <Wifi size={14} aria-hidden="true" />
      ) : (
        <WifiOff size={14} aria-hidden="true" />
      )}
      {estado.fase === "reconectando"
        ? "Reconectando…"
        : `${nombres[rival]} ${rivalConectado ? "está conectado" : "no está conectado"}`}
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
      <p className="text-ink text-[14px]" aria-label="Marcador">
        <span className="text-muted">Juego {numeroDeJuego(sala)} ·</span>{" "}
        <span className="font-bold tabular-nums">
          Tú {lado === "a" ? sala.victorias_a : sala.victorias_b} –{" "}
          {lado === "a" ? sala.victorias_b : sala.victorias_a} {nombres[rival]}
        </span>
      </p>
      {conexion}
      <button
        type="button"
        onClick={() => setTerminando(true)}
        disabled={ocupado || declaroRival || !tablero}
        className={BOTON_SECUNDARIO_COMPACTO}
      >
        <Flag size={14} aria-hidden="true" />
        Terminar juego
      </button>
      <button
        type="button"
        onClick={() => setAbandonando(true)}
        disabled={ocupado}
        className={cn(BOTON_SECUNDARIO_COMPACTO, HOVER_PELIGRO)}
      >
        <LogOut size={14} aria-hidden="true" />
        Abandonar la serie
      </button>
      <Link
        href="/mesa/"
        title="La sala queda abierta: si no vuelves en 2 minutos, la serie es de tu rival."
        className={cn(ENLACE, "text-[14px]")}
      >
        Salir por ahora
      </Link>
    </div>
  );

  const declaracion = declaroYo ? (
    <p
      role="status"
      className={cn(AVISO_EN_LINEA, "border-brand-500/50 text-ink items-center")}
    >
      <Scale size={16} aria-hidden="true" className="text-accent" />
      <span className="mr-auto">
        Declaraste {loDeclarado("yo")}. Esperando a que {nombres[rival]} lo confirme.
      </span>
      <button
        type="button"
        onClick={() => setTerminando(true)}
        disabled={ocupado}
        className={BOTON_SECUNDARIO_COMPACTO}
      >
        Cambiar
      </button>
    </p>
  ) : declaroRival ? (
    <div
      role="alert"
      className={cn(
        AVISO_EN_LINEA,
        "border-brand-500/50 text-ink flex-wrap items-center",
      )}
    >
      <Scale size={16} aria-hidden="true" className="text-accent" />
      <span className="mr-auto">
        {nombres[rival]} declara {loDeclarado("rival")} este juego. ¿Estás de acuerdo?
      </span>
      <button
        type="button"
        onClick={() => void enLaSala(() => responderResultado(mesa, true))}
        disabled={ocupado}
        className={BOTON_PRIMARIO_COMPACTO}
      >
        Sí, de acuerdo
      </button>
      <button
        type="button"
        onClick={() => setAnulando(true)}
        disabled={ocupado}
        className={cn(BOTON_SECUNDARIO_COMPACTO, HOVER_AVISO)}
      >
        No estoy de acuerdo
      </button>
    </div>
  ) : null;

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

  const dialogoAbandonar = (
    <ConfirmDialog
      open={abandonando}
      titulo="¿Abandonar la serie?"
      mensaje={`La serie es para ${nombres[rival]} y la sala se cierra para los dos.`}
      confirmar="Abandonar la serie"
      onCancel={() => setAbandonando(false)}
      onConfirm={() => {
        setAbandonando(false);
        void enLaSala(() => abandonarSala(mesa));
      }}
    />
  );

  if (estado.fase === "error") {
    return (
      <div className={VACIO}>
        <p className="text-ink">{estado.mensaje}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              fallos.current = 0;
              setEstado({ fase: "preparando" });
              setIntento((n) => n + 1);
            }}
            className={BOTON_PRIMARIO_COMPACTO}
          >
            <RotateCw size={14} aria-hidden="true" />
            Reintentar
          </button>
          <Link href="/mesa/" className={ENLACE}>
            Volver a la mesa
          </Link>
        </div>
      </div>
    );
  }
  if (!tablero) {
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <p className={AVISO_EN_LINEA}>
          Los dos están listos: la sala está en juego.{" "}
          {estado.fase === "lista"
            ? rivalConectado
              ? "Preparando la mesa…"
              : `Preparando la mesa: esperando a que ${nombres[rival]} entre.`
            : "Conectando a la mesa…"}
        </p>
        {dialogoAbandonar}
      </div>
    );
  }
  return (
    <>
      {terminando && (
        <DialogoResultado
          rival={nombres[rival]}
          onElegir={elegir}
          onCerrar={() => setTerminando(false)}
        />
      )}
      {dialogoAbandonar}
      <ConfirmDialog
        open={anulando}
        titulo="¿Anular el juego?"
        mensaje={`Si no estás de acuerdo con ${nombres[rival]}, el juego se anula y se juega de nuevo, sin sumar al marcador.`}
        confirmar="Anular el juego"
        tono="aviso"
        onCancel={() => setAnulando(false)}
        onConfirm={() => {
          setAnulando(false);
          void enLaSala(() => responderResultado(mesa, false));
        }}
      />
      <TableroMesa
        mesa={tablero}
        yo={lado}
        hacer={hacer}
        cartas={cartas}
        formato={formato}
        cabecera={cabecera}
        aviso={
          cuenta || declaracion ? (
            <div className="flex flex-col gap-2">
              {cuenta}
              {declaracion}
            </div>
          ) : null
        }
        nombreJugador={(id) => (id === lado ? "Tú" : nombres[rival])}
      />
    </>
  );
}
